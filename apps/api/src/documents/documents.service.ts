import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { access } from "node:fs/promises";
import { DbService } from "../db/db.service";
import {
  DOCUMENT_MAX_BYTES,
  absoluteDocumentPath,
  countAppDocumentsByRecordUid,
  listAppDocuments,
  listRecordDocuments,
  removeDocumentFile,
  removeRecordDocumentsDir,
  writeDocumentFile,
} from "./document.storage";
import {
  isDocumentApp,
  type DocumentApp,
  type DocumentPublic,
} from "./document.types";

type AssetRef = {
  uid: string;
  key: string;
};

@Injectable()
export class DocumentsService {
  constructor(private readonly db: DbService) {}

  assertApp(app: string | undefined): DocumentApp {
    if (!app || !isDocumentApp(app)) {
      throw new BadRequestException(
        "Unbekannte oder nicht dokumententaugliche App",
      );
    }
    return app;
  }

  async listForSite(
    siteUid: string,
    appRaw: string | undefined,
    recordKey?: string,
  ): Promise<DocumentPublic[]> {
    const app = this.assertApp(appRaw);

    if (recordKey && recordKey.length > 0) {
      const asset = await this.findAssetByKey(siteUid, recordKey);
      if (!asset) {
        throw new NotFoundException("Datensatz nicht gefunden");
      }
      const stored = await listRecordDocuments(siteUid, app, asset.uid);
      return stored.map((doc) => this.toPublic(doc, app, asset.key));
    }

    const stored = await listAppDocuments(siteUid, app);
    const keyByUid = await this.assetKeyByUid(siteUid);
    const docs: DocumentPublic[] = [];
    for (const doc of stored) {
      const recordKeyResolved = keyByUid.get(doc.recordUid);
      if (!recordKeyResolved) {
        // Orphan directory for a deleted record — skip in listings.
        continue;
      }
      docs.push(this.toPublic(doc, app, recordKeyResolved));
    }
    return docs;
  }

  async countsForSite(
    siteUid: string,
    appRaw: string | undefined,
  ): Promise<Record<string, number>> {
    const app = this.assertApp(appRaw);
    const byUid = await countAppDocumentsByRecordUid(siteUid, app);
    if (byUid.size === 0) {
      return {};
    }
    const keyByUid = await this.assetKeyByUid(siteUid);
    const result: Record<string, number> = {};
    for (const [uid, count] of byUid) {
      const key = keyByUid.get(uid);
      if (key) {
        result[key] = count;
      }
    }
    return result;
  }

  async uploadForAsset(
    siteUid: string,
    key: string,
    files: Array<{ originalname: string; size: number; buffer: Buffer }>,
  ): Promise<DocumentPublic[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException("Dokument-Datei fehlt");
    }

    const asset = await this.findAssetByKey(siteUid, key);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }

    const uploaded: DocumentPublic[] = [];
    for (const file of files) {
      if (file.size <= 0 || file.size > DOCUMENT_MAX_BYTES) {
        throw new BadRequestException(
          "Dokument darf maximal 25 MB groß sein",
        );
      }
      let filename: string;
      try {
        filename = await writeDocumentFile(
          siteUid,
          "assets",
          asset.uid,
          file.originalname,
          file.buffer,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload fehlgeschlagen";
        throw new BadRequestException(message);
      }
      const listed = await listRecordDocuments(siteUid, "assets", asset.uid);
      const meta = listed.find((item) => item.name === filename);
      if (!meta) {
        throw new BadRequestException("Upload fehlgeschlagen");
      }
      uploaded.push(this.toPublic(meta, "assets", asset.key));
    }
    return uploaded;
  }

  async resolveDownloadPath(
    siteUid: string,
    key: string,
    filename: string,
  ): Promise<{ absolute: string; filename: string }> {
    const asset = await this.findAssetByKey(siteUid, key);
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
    try {
      await access(absolute);
    } catch {
      throw new NotFoundException("Dokument nicht gefunden");
    }
    return { absolute, filename };
  }

  async deleteForAsset(
    siteUid: string,
    key: string,
    filename: string,
  ): Promise<void> {
    const asset = await this.findAssetByKey(siteUid, key);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }
    const removed = await removeDocumentFile(
      siteUid,
      "assets",
      asset.uid,
      filename,
    );
    if (!removed) {
      throw new NotFoundException("Dokument nicht gefunden");
    }
  }

  async removeAllForAsset(siteUid: string, assetUid: string): Promise<void> {
    await removeRecordDocumentsDir(siteUid, "assets", assetUid);
  }

  private toPublic(
    doc: { name: string; size: number; modifiedAt: Date },
    app: DocumentApp,
    recordKey: string,
  ): DocumentPublic {
    return {
      name: doc.name,
      size: doc.size,
      modifiedAt: doc.modifiedAt.toISOString(),
      app,
      recordKey,
    };
  }

  private async findAssetByKey(
    siteUid: string,
    key: string,
  ): Promise<AssetRef | null> {
    const result = await this.db.query<AssetRef>(
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
