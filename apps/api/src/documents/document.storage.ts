import { mkdir, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { DocumentApp } from "./document.types";

export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

/** Sidecar cache written by the AI document-text extractor. */
export const DOCUMENT_TEXT_CACHE_SUFFIX = ".pulse-ai-text.json";

export function isDocumentTextCacheFile(name: string): boolean {
  return name.endsWith(DOCUMENT_TEXT_CACHE_SUFFIX);
}

export function documentTextCacheName(filename: string): string {
  return `${filename}${DOCUMENT_TEXT_CACHE_SUFFIX}`;
}

/** Root for all document files. Later this can read from config. */
export function documentStorageDir(): string {
  return join(process.cwd(), "doc");
}

export function recordDocumentsDir(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
): string {
  return join(documentStorageDir(), siteUid, app, recordUid);
}

export async function ensureRecordDocumentsDir(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
): Promise<string> {
  const dir = recordDocumentsDir(siteUid, app, recordUid);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Multer's default charset is latin1, so UTF-8 filenames (ä, ö, ü, ß) were
 * stored as mojibake, sometimes more than once. Each pass decodes a complete
 * UTF-8 sequence that was read as latin1 and leaves real umlauts alone.
 */
export function repairUtf8Mojibake(value: string): string {
  let current = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = repairUtf8MojibakePass(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}

function repairUtf8MojibakePass(value: string): string {
  const chars = [...value];
  let out = "";
  let index = 0;
  while (index < chars.length) {
    const length = utf8MojibakeSequenceLength(chars, index);
    if (length !== null) {
      const slice = chars.slice(index, index + length).join("");
      const decoded = Buffer.from(slice, "latin1").toString("utf8");
      if (
        !decoded.includes("\uFFFD") &&
        decoded !== slice &&
        Buffer.from(decoded, "utf8").toString("latin1") === slice
      ) {
        out += decoded;
        index += length;
        continue;
      }
    }
    out += chars[index] ?? "";
    index += 1;
  }
  return out;
}

function utf8MojibakeSequenceLength(
  chars: string[],
  index: number,
): number | null {
  const lead = chars[index]?.codePointAt(0);
  if (lead === undefined || lead > 0xff) return null;

  let size = 0;
  if (lead >= 0xc2 && lead <= 0xdf) size = 2;
  else if (lead >= 0xe0 && lead <= 0xef) size = 3;
  else if (lead >= 0xf0 && lead <= 0xf4) size = 4;
  else return null;

  if (index + size > chars.length) return null;
  for (let offset = 1; offset < size; offset += 1) {
    const byte = chars[index + offset]?.codePointAt(0);
    if (byte === undefined || byte < 0x80 || byte > 0xbf) return null;
  }
  return size;
}

export function sanitizeDocumentFilename(original: string): string | null {
  const base = basename(original).normalize("NFC").trim();
  if (!base || base === "." || base === "..") {
    return null;
  }
  if (base.includes("/") || base.includes("\\") || base.includes("\0")) {
    return null;
  }
  if (base.includes("..")) {
    return null;
  }
  // Strip characters that are awkward on Windows / in URLs.
  const cleaned = base.replace(/[<>:"|?*\u0000-\u001f]/g, "_").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return null;
  }
  return cleaned;
}

export async function uniqueDocumentFilename(
  dir: string,
  desiredName: string,
): Promise<string> {
  const existing = new Set(await readdir(dir).catch(() => [] as string[]));
  if (!existing.has(desiredName)) {
    return desiredName;
  }

  const extension = extname(desiredName);
  const stem =
    extension.length > 0
      ? desiredName.slice(0, -extension.length)
      : desiredName;

  let index = 2;
  while (index < 10_000) {
    const candidate = `${stem} (${index})${extension}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
  throw new Error("Kein freier Dateiname verfügbar");
}

export async function writeDocumentFile(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
  originalName: string,
  buffer: Buffer,
): Promise<string> {
  const sanitized = sanitizeDocumentFilename(repairUtf8Mojibake(originalName));
  if (!sanitized) {
    throw new Error("Ungültiger Dateiname");
  }
  const dir = await ensureRecordDocumentsDir(siteUid, app, recordUid);
  const filename = await uniqueDocumentFilename(dir, sanitized);
  await writeFile(join(dir, filename), buffer);
  return filename;
}

export async function removeDocumentFile(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
  filename: string,
): Promise<boolean> {
  const safe = sanitizeDocumentFilename(filename);
  if (!safe || safe !== filename) {
    return false;
  }
  const dir = recordDocumentsDir(siteUid, app, recordUid);
  const absolute = join(dir, safe);
  try {
    await unlink(absolute);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "ENOENT") {
      return false;
    }
    throw error;
  }

  const cacheAbsolute = join(dir, documentTextCacheName(safe));
  try {
    await unlink(cacheAbsolute);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
  }
  return true;
}

export async function removeRecordDocumentsDir(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
): Promise<void> {
  const dir = recordDocumentsDir(siteUid, app, recordUid);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

function fsErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Rename a stored file whose name is UTF-8 misread as latin1. */
async function healStoredDocumentName(
  dir: string,
  name: string,
): Promise<string> {
  const repaired = repairUtf8Mojibake(name);
  const sanitized = sanitizeDocumentFilename(repaired);
  if (!sanitized || sanitized === name) return name;

  const target = await uniqueDocumentFilename(dir, sanitized);
  try {
    await rename(join(dir, name), join(dir, target));
  } catch (error) {
    if (fsErrorCode(error) === "ENOENT") return name;
    throw error;
  }

  try {
    await rename(
      join(dir, documentTextCacheName(name)),
      join(dir, documentTextCacheName(target)),
    );
  } catch (error) {
    if (fsErrorCode(error) !== "ENOENT") throw error;
  }
  return target;
}

export type StoredDocumentMeta = {
  name: string;
  size: number;
  modifiedAt: Date;
  recordUid: string;
};

export async function listRecordDocuments(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
): Promise<StoredDocumentMeta[]> {
  const dir = recordDocumentsDir(siteUid, app, recordUid);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const docs: StoredDocumentMeta[] = [];
  for (const name of names) {
    if (isDocumentTextCacheFile(name)) continue;
    const healed = await healStoredDocumentName(dir, name);
    const absolute = join(dir, healed);
    let info;
    try {
      info = await stat(absolute);
    } catch (error) {
      if (fsErrorCode(error) === "ENOENT") continue;
      throw error;
    }
    if (!info.isFile()) continue;
    docs.push({
      name: healed,
      size: info.size,
      modifiedAt: info.mtime,
      recordUid,
    });
  }
  return docs;
}

export async function listAppDocuments(
  siteUid: string,
  app: DocumentApp,
): Promise<StoredDocumentMeta[]> {
  const base = join(documentStorageDir(), siteUid, app);
  let recordUids: string[];
  try {
    recordUids = await readdir(base);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const docs: StoredDocumentMeta[] = [];
  for (const recordUid of recordUids) {
    const absolute = join(base, recordUid);
    const info = await stat(absolute);
    if (!info.isDirectory()) continue;
    const nested = await listRecordDocuments(siteUid, app, recordUid);
    docs.push(...nested);
  }
  return docs;
}

export async function countAppDocumentsByRecordUid(
  siteUid: string,
  app: DocumentApp,
): Promise<Map<string, number>> {
  const base = join(documentStorageDir(), siteUid, app);
  let recordUids: string[];
  try {
    recordUids = await readdir(base);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "ENOENT") {
      return new Map();
    }
    throw error;
  }

  const counts = new Map<string, number>();
  for (const recordUid of recordUids) {
    const absolute = join(base, recordUid);
    const info = await stat(absolute);
    if (!info.isDirectory()) continue;
    const names = await readdir(absolute);
    let fileCount = 0;
    for (const name of names) {
      if (isDocumentTextCacheFile(name)) continue;
      const fileInfo = await stat(join(absolute, name));
      if (fileInfo.isFile()) {
        fileCount += 1;
      }
    }
    if (fileCount > 0) {
      counts.set(recordUid, fileCount);
    }
  }
  return counts;
}

export function absoluteDocumentPath(
  siteUid: string,
  app: DocumentApp,
  recordUid: string,
  filename: string,
): string | null {
  const safe = sanitizeDocumentFilename(filename);
  if (!safe || safe !== filename) {
    return null;
  }
  return join(recordDocumentsDir(siteUid, app, recordUid), safe);
}
