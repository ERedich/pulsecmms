import { Injectable, NotFoundException } from "@nestjs/common";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import { DbService } from "../db/db.service";
import {
  absoluteDocumentPath,
  documentTextCacheName,
  listAppDocuments,
} from "../documents/document.storage";
const MAX_EXTRACTED_CHARS = 40_000;
const MAX_SEARCH_SNIPPET = 320;
const MAX_XLSX_ROWS = 80;

type TextCachePayload = {
  sourceMtimeMs: number;
  text: string;
  note: string | null;
  extractedAt: string;
};

export type DocumentTextResult = {
  app: "assets";
  recordKey: string;
  name: string;
  size: number;
  modifiedAt: string;
  text: string;
  truncated: boolean;
  note: string | null;
};

export type DocumentSearchHit = {
  app: "assets";
  recordKey: string;
  name: string;
  size: number;
  modifiedAt: string;
  matchIn: "filename" | "content" | "both";
  snippet: string | null;
};

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".svg",
]);

@Injectable()
export class DocumentTextService {
  constructor(private readonly db: DbService) {}

  async search(
    siteUid: string,
    query: string,
    limit: number,
  ): Promise<{ total: number; items: DocumentSearchHit[] }> {
    const needle = query.trim().toLowerCase();
    const stored = await listAppDocuments(siteUid, "assets");
    const keyByUid = await this.assetKeyByUid(siteUid);
    const hits: DocumentSearchHit[] = [];

    for (const doc of stored) {
      const recordKey = keyByUid.get(doc.recordUid);
      if (!recordKey) continue;

      // Empty query = list all documents (metadata only).
      if (!needle) {
        hits.push({
          app: "assets",
          recordKey,
          name: doc.name,
          size: doc.size,
          modifiedAt: doc.modifiedAt.toISOString(),
          matchIn: "filename",
          snippet: null,
        });
        continue;
      }

      const nameMatch = doc.name.toLowerCase().includes(needle);
      let contentMatch = false;
      let snippet: string | null = null;

      const extracted = await this.extractCached(
        siteUid,
        "assets",
        doc.recordUid,
        doc.name,
      );
      if (extracted.text) {
        const lower = extracted.text.toLowerCase();
        const index = lower.indexOf(needle);
        if (index >= 0) {
          contentMatch = true;
          snippet = clipSnippet(extracted.text, index, needle.length);
        }
      }

      if (!nameMatch && !contentMatch) continue;

      hits.push({
        app: "assets",
        recordKey,
        name: doc.name,
        size: doc.size,
        modifiedAt: doc.modifiedAt.toISOString(),
        matchIn: nameMatch && contentMatch ? "both" : nameMatch ? "filename" : "content",
        snippet,
      });
    }

    return {
      total: hits.length,
      items: hits.slice(0, limit),
    };
  }

  async read(
    siteUid: string,
    recordKey: string,
    filename: string,
  ): Promise<DocumentTextResult> {
    const asset = await this.findAssetByKey(siteUid, recordKey);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }

    const absolute = absoluteDocumentPath(
      siteUid,
      "assets",
      asset.uid,
      filename,
    );
    if (!absolute) {
      throw new NotFoundException("Dokument nicht gefunden");
    }

    let info;
    try {
      info = await stat(absolute);
    } catch {
      throw new NotFoundException("Dokument nicht gefunden");
    }
    if (!info.isFile()) {
      throw new NotFoundException("Dokument nicht gefunden");
    }

    const extracted = await this.extractCached(
      siteUid,
      "assets",
      asset.uid,
      filename,
    );
    const truncated = extracted.text.length > MAX_EXTRACTED_CHARS;
    return {
      app: "assets",
      recordKey,
      name: filename,
      size: info.size,
      modifiedAt: info.mtime.toISOString(),
      text: truncated
        ? extracted.text.slice(0, MAX_EXTRACTED_CHARS)
        : extracted.text,
      truncated,
      note: extracted.note,
    };
  }

  private async extractCached(
    siteUid: string,
    app: "assets",
    recordUid: string,
    filename: string,
  ): Promise<{ text: string; note: string | null }> {
    const absolute = absoluteDocumentPath(siteUid, app, recordUid, filename);
    if (!absolute) {
      return { text: "", note: "Ungültiger Dateiname" };
    }

    let sourceStat;
    try {
      sourceStat = await stat(absolute);
    } catch {
      return { text: "", note: "Dokument nicht gefunden" };
    }

    const cachePath = absoluteDocumentPath(
      siteUid,
      app,
      recordUid,
      documentTextCacheName(filename),
    );
    if (cachePath) {
      try {
        const raw = await readFile(cachePath, "utf8");
        const cached = JSON.parse(raw) as TextCachePayload;
        if (
          cached &&
          typeof cached.sourceMtimeMs === "number" &&
          cached.sourceMtimeMs === sourceStat.mtimeMs &&
          typeof cached.text === "string"
        ) {
          return {
            text: cached.text,
            note: cached.note ?? null,
          };
        }
      } catch {
        // Rebuild cache below.
      }
    }

    const extracted = await this.extractFromFile(absolute, filename);
    if (cachePath) {
      const payload: TextCachePayload = {
        sourceMtimeMs: sourceStat.mtimeMs,
        text: extracted.text,
        note: extracted.note,
        extractedAt: new Date().toISOString(),
      };
      try {
        await writeFile(cachePath, JSON.stringify(payload), "utf8");
      } catch {
        // Cache write failures are non-fatal.
      }
    }
    return extracted;
  }

  private async extractFromFile(
    absolute: string,
    filename: string,
  ): Promise<{ text: string; note: string | null }> {
    const extension = extname(filename).toLowerCase();

    if (IMAGE_EXTENSIONS.has(extension)) {
      return {
        text: "",
        note: "Bilddatei — Inhalt wird in Version 1 nicht visuell interpretiert.",
      };
    }

    try {
      if (extension === ".txt" || extension === ".csv" || extension === ".md") {
        const text = await readFile(absolute, "utf8");
        return { text: text.trim(), note: null };
      }

      if (extension === ".pdf") {
        const buffer = await readFile(absolute);
        const parser = new PDFParse({ data: buffer });
        try {
          const result = await parser.getText();
          const text = (result.text ?? "").trim();
          if (!text) {
            return {
              text: "",
              note: "PDF ohne extrahierbaren Text (vermutlich Scan ohne Textlayer).",
            };
          }
          return { text, note: null };
        } finally {
          await parser.destroy().catch(() => undefined);
        }
      }

      if (extension === ".docx") {
        const buffer = await readFile(absolute);
        const result = await mammoth.extractRawText({ buffer });
        return { text: (result.value ?? "").trim(), note: null };
      }

      if (extension === ".xlsx" || extension === ".xls") {
        const buffer = await readFile(absolute);
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const parts: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(
            sheet,
            { header: 1, defval: "" },
          );
          const limited = rows.slice(0, MAX_XLSX_ROWS);
          const body = limited
            .map((row) =>
              row
                .map((cell) => String(cell ?? "").trim())
                .filter(Boolean)
                .join(" | "),
            )
            .filter(Boolean)
            .join("\n");
          if (body) {
            parts.push(`# ${sheetName}\n${body}`);
          }
        }
        const text = parts.join("\n\n").trim();
        const note =
          rowsExceeded(workbook) ?
            `Nur die ersten ${MAX_XLSX_ROWS} Zeilen je Blatt wurden gelesen.`
          : null;
        return { text, note };
      }

      if (extension === ".doc" || extension === ".ppt" || extension === ".pptx") {
        return {
          text: "",
          note: `Dateityp ${extension} wird in Version 1 noch nicht inhaltlich gelesen.`,
        };
      }

      // Best-effort plain text for unknown types.
      const buffer = await readFile(absolute);
      const sample = buffer.subarray(0, Math.min(buffer.length, 64));
      if (sample.includes(0)) {
        return {
          text: "",
          note: `Binärdatei (${extension || "ohne Endung"}) — kein Text extrahiert.`,
        };
      }
      return { text: buffer.toString("utf8").trim(), note: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Extraktion fehlgeschlagen";
      return { text: "", note: message };
    }
  }

  private async findAssetByKey(
    siteUid: string,
    key: string,
  ): Promise<{ uid: string; key: string } | null> {
    const result = await this.db.query<{ uid: string; key: string }>(
      `SELECT uid, key
       FROM assets
       WHERE fk_site = $1 AND key = $2
       LIMIT 1`,
      [siteUid, key],
    );
    return result.rows[0] ?? null;
  }

  private async assetKeyByUid(siteUid: string): Promise<Map<string, string>> {
    const result = await this.db.query<{ uid: string; key: string }>(
      `SELECT uid, key
       FROM assets
       WHERE fk_site = $1`,
      [siteUid],
    );
    return new Map(result.rows.map((row) => [row.uid, row.key]));
  }
}

function clipSnippet(
  text: string,
  index: number,
  matchLength: number,
): string {
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + matchLength + 160);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  if (snippet.length > MAX_SEARCH_SNIPPET) {
    snippet = `${snippet.slice(0, MAX_SEARCH_SNIPPET - 1)}…`;
  }
  return snippet;
}

function rowsExceeded(workbook: XLSX.WorkBook): boolean {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length > MAX_XLSX_ROWS) return true;
  }
  return false;
}
