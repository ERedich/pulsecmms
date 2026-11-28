import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService, type DbClient } from "../db/db.service";
import { removeRecordDocumentsDir } from "../documents/document.storage";
import {
  ASSET_THUMBNAIL_MAX_BYTES,
  isAllowedThumbnailMime,
  removeAssetThumbnailFile,
  thumbnailPublicUrl,
  writeAssetThumbnail,
} from "./asset-thumbnail.storage";
import {
  canHostAssetType,
  isAssetType,
  parentIsRequired,
  type AssetType,
} from "./asset.types";
import type { CreateAssetDto } from "./dto/create-asset.dto";
import type { UpdateAssetDto } from "./dto/update-asset.dto";

type AssetRow = {
  uid: string;
  key: string;
  fk_site: string;
  type: string;
  fk_parent: string | null;
  fk_cost_center: string;
  serial_number: string | null;
  manufacturer: string | null;
  thumbnail_path: string | null;
  parent_key: string | null;
  cost_center_key: string;
};

export type AssetPublic = {
  uid: string;
  key: string;
  type: AssetType;
  parentKey: string | null;
  costCenterKey: string;
  serialNumber: string | null;
  manufacturer: string | null;
  thumbnailUrl: string | null;
};

const ASSET_SELECT = `
  a.uid,
  a.key,
  a.fk_site,
  a.type,
  a.fk_parent,
  a.fk_cost_center,
  a.serial_number,
  a.manufacturer,
  a.thumbnail_path,
  parent.key AS parent_key,
  cc.key AS cost_center_key
`;

const ASSET_FROM = `
  FROM assets a
  LEFT JOIN assets parent ON parent.uid = a.fk_parent
  INNER JOIN cost_centers cc ON cc.uid = a.fk_cost_center
`;

@Injectable()
export class AssetsService {
  constructor(private readonly db: DbService) {}

  async listForSite(siteUid: string): Promise<AssetPublic[]> {
    const result = await this.db.query<AssetRow>(
      `SELECT ${ASSET_SELECT}
       ${ASSET_FROM}
       WHERE a.fk_site = $1
       ORDER BY a.key`,
      [siteUid],
    );
    return result.rows.map((row) => this.toPublic(row));
  }

  async getForSite(siteUid: string, key: string): Promise<AssetPublic> {
    const asset = await this.findByKeyInSite(siteUid, key);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }
    return this.toPublic(asset);
  }

  async createForSite(
    siteUid: string,
    dto: CreateAssetDto,
  ): Promise<AssetPublic> {
    const normalized = this.normalizeWriteInput(dto);

    return this.db.transaction(async (client) => {
      await this.assertKeyAvailable(client, siteUid, normalized.key);

      const costCenterUid = await this.resolveCostCenterUid(
        client,
        siteUid,
        normalized.costCenterKey,
      );
      const parentUid = await this.resolveParentUid(
        client,
        siteUid,
        normalized.type,
        normalized.parentKey,
      );

      const inserted = await client.query<AssetRow>(
        `WITH inserted AS (
           INSERT INTO assets (
             key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING uid, key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer, thumbnail_path
         )
         SELECT ${ASSET_SELECT.replace(/\ba\./g, "inserted.")}
         FROM inserted
         LEFT JOIN assets parent ON parent.uid = inserted.fk_parent
         INNER JOIN cost_centers cc ON cc.uid = inserted.fk_cost_center`,
        [
          normalized.key,
          siteUid,
          normalized.type,
          parentUid,
          costCenterUid,
          normalized.serialNumber,
          normalized.manufacturer,
        ],
      );
      const asset = inserted.rows[0];
      if (!asset) {
        throw new Error("Asset konnte nicht angelegt werden");
      }
      return this.toPublic(asset);
    });
  }

  async updateForSite(
    siteUid: string,
    currentKey: string,
    dto: UpdateAssetDto,
  ): Promise<AssetPublic> {
    const normalized = this.normalizeWriteInput(dto);

    return this.db.transaction(async (client) => {
      const existing = await this.findByKeyInSiteWithClient(
        client,
        siteUid,
        currentKey,
      );
      if (!existing) {
        throw new NotFoundException("Asset nicht gefunden");
      }

      if (keyChanged(existing.key, normalized.key)) {
        await this.assertKeyAvailable(client, siteUid, normalized.key);
      }

      if (existing.type !== normalized.type) {
        await this.assertNoChildren(client, existing.uid);
      }

      const costCenterUid = await this.resolveCostCenterUid(
        client,
        siteUid,
        normalized.costCenterKey,
      );
      const parentUid = await this.resolveParentUid(
        client,
        siteUid,
        normalized.type,
        normalized.parentKey,
        existing.uid,
      );

      const updated = await client.query<AssetRow>(
        `WITH updated AS (
           UPDATE assets
           SET key = $1,
               type = $2,
               fk_parent = $3,
               fk_cost_center = $4,
               serial_number = $5,
               manufacturer = $6,
               updated_at = NOW()
           WHERE uid = $7
           RETURNING uid, key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer, thumbnail_path
         )
         SELECT ${ASSET_SELECT.replace(/\ba\./g, "updated.")}
         FROM updated
         LEFT JOIN assets parent ON parent.uid = updated.fk_parent
         INNER JOIN cost_centers cc ON cc.uid = updated.fk_cost_center`,
        [
          normalized.key,
          normalized.type,
          parentUid,
          costCenterUid,
          normalized.serialNumber,
          normalized.manufacturer,
          existing.uid,
        ],
      );
      const asset = updated.rows[0];
      if (!asset) {
        throw new NotFoundException("Asset nicht gefunden");
      }
      return this.toPublic(asset);
    });
  }

  async deleteForSite(siteUid: string, key: string): Promise<void> {
    const asset = await this.findByKeyInSite(siteUid, key);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }

    await this.assertNoChildren(this.db, asset.uid);

    await this.db.query(`DELETE FROM assets WHERE uid = $1`, [asset.uid]);
    await removeAssetThumbnailFile(asset.thumbnail_path);
    await removeRecordDocumentsDir(siteUid, "assets", asset.uid);
  }

  async setThumbnailForSite(
    siteUid: string,
    key: string,
    file: { mimetype: string; size: number; buffer: Buffer },
  ): Promise<AssetPublic> {
    if (!isAllowedThumbnailMime(file.mimetype)) {
      throw new BadRequestException(
        "Nur JPEG, PNG oder WebP sind als Thumbnail erlaubt",
      );
    }
    if (file.size <= 0 || file.size > ASSET_THUMBNAIL_MAX_BYTES) {
      throw new BadRequestException(
        "Thumbnail darf maximal 2 MB groß sein",
      );
    }

    const asset = await this.findByKeyInSite(siteUid, key);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }

    const filename = await writeAssetThumbnail(
      asset.uid,
      file.mimetype,
      file.buffer,
    );

    if (asset.thumbnail_path && asset.thumbnail_path !== filename) {
      await removeAssetThumbnailFile(asset.thumbnail_path);
    }

    const updated = await this.db.query<AssetRow>(
      `WITH updated AS (
         UPDATE assets
         SET thumbnail_path = $1,
             updated_at = NOW()
         WHERE uid = $2
         RETURNING uid, key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer, thumbnail_path
       )
       SELECT ${ASSET_SELECT.replace(/\ba\./g, "updated.")}
       FROM updated
       LEFT JOIN assets parent ON parent.uid = updated.fk_parent
       INNER JOIN cost_centers cc ON cc.uid = updated.fk_cost_center`,
      [filename, asset.uid],
    );
    const row = updated.rows[0];
    if (!row) {
      throw new NotFoundException("Asset nicht gefunden");
    }
    return this.toPublic(row);
  }

  async clearThumbnailForSite(
    siteUid: string,
    key: string,
  ): Promise<AssetPublic> {
    const asset = await this.findByKeyInSite(siteUid, key);
    if (!asset) {
      throw new NotFoundException("Asset nicht gefunden");
    }

    const updated = await this.db.query<AssetRow>(
      `WITH updated AS (
         UPDATE assets
         SET thumbnail_path = NULL,
             updated_at = NOW()
         WHERE uid = $1
         RETURNING uid, key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer, thumbnail_path
       )
       SELECT ${ASSET_SELECT.replace(/\ba\./g, "updated.")}
       FROM updated
       LEFT JOIN assets parent ON parent.uid = updated.fk_parent
       INNER JOIN cost_centers cc ON cc.uid = updated.fk_cost_center`,
      [asset.uid],
    );
    const row = updated.rows[0];
    if (!row) {
      throw new NotFoundException("Asset nicht gefunden");
    }

    await removeAssetThumbnailFile(asset.thumbnail_path);
    return this.toPublic(row);
  }

  private normalizeWriteInput(dto: CreateAssetDto | UpdateAssetDto): {
    key: string;
    type: AssetType;
    parentKey: string | null;
    costCenterKey: string;
    serialNumber: string | null;
    manufacturer: string | null;
  } {
    if (!isAssetType(dto.type)) {
      throw new BadRequestException("Ungültiger Asset-Typ");
    }

    const parentKey =
      dto.parentKey === null || dto.parentKey === undefined
        ? null
        : dto.parentKey.trim();
    if (parentKey !== null && parentKey.length === 0) {
      throw new BadRequestException("Typ darf nicht leer sein");
    }

    return {
      key: dto.key.trim(),
      type: dto.type,
      parentKey,
      costCenterKey: dto.costCenterKey.trim(),
      serialNumber: emptyToNull(dto.serialNumber),
      manufacturer: emptyToNull(dto.manufacturer),
    };
  }

  private toPublic(asset: AssetRow): AssetPublic {
    if (!isAssetType(asset.type)) {
      throw new Error(`Ungültiger Asset-Typ in der Datenbank: ${asset.type}`);
    }
    return {
      uid: asset.uid,
      key: asset.key,
      type: asset.type,
      parentKey: asset.parent_key,
      costCenterKey: asset.cost_center_key,
      serialNumber: asset.serial_number,
      manufacturer: asset.manufacturer,
      thumbnailUrl: asset.thumbnail_path
        ? thumbnailPublicUrl(asset.thumbnail_path)
        : null,
    };
  }

  private async findByKeyInSite(
    siteUid: string,
    key: string,
  ): Promise<AssetRow | null> {
    return this.findByKeyInSiteWithClient(this.db, siteUid, key);
  }

  private async findByKeyInSiteWithClient(
    client: DbClient,
    siteUid: string,
    key: string,
  ): Promise<AssetRow | null> {
    const result = await client.query<AssetRow>(
      `SELECT ${ASSET_SELECT}
       ${ASSET_FROM}
       WHERE a.fk_site = $1 AND a.key = $2`,
      [siteUid, key],
    );
    return result.rows[0] ?? null;
  }

  private async assertKeyAvailable(
    client: DbClient,
    siteUid: string,
    key: string,
  ): Promise<void> {
    const result = await client.query<{ uid: string }>(
      `SELECT uid FROM assets WHERE fk_site = $1 AND key = $2`,
      [siteUid, key],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("Schlüssel ist bereits vergeben");
    }
  }

  private async assertNoChildren(
    client: DbClient,
    assetUid: string,
  ): Promise<void> {
    const result = await client.query<{ uid: string }>(
      `SELECT uid FROM assets WHERE fk_parent = $1 LIMIT 1`,
      [assetUid],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException(
        "Asset wird noch referenziert und kann nicht gelöscht oder im Typ geändert werden.",
      );
    }
  }

  private async resolveCostCenterUid(
    client: DbClient,
    siteUid: string,
    costCenterKey: string,
  ): Promise<string> {
    const result = await client.query<{ uid: string }>(
      `SELECT uid FROM cost_centers WHERE fk_site = $1 AND key = $2`,
      [siteUid, costCenterKey],
    );
    const uid = result.rows[0]?.uid;
    if (!uid) {
      throw new ConflictException(
        "Kostenstelle nicht gefunden oder gehört nicht zum Mandanten",
      );
    }
    return uid;
  }

  private async resolveParentUid(
    client: DbClient,
    siteUid: string,
    type: AssetType,
    parentKey: string | null,
    selfUid?: string,
  ): Promise<string | null> {
    if (parentKey === null) {
      if (parentIsRequired(type)) {
        throw new ConflictException(
          "Typ ist für diesen Asset-Typ Pflicht",
        );
      }
      return null;
    }

    const result = await client.query<{ uid: string; type: string }>(
      `SELECT uid, type FROM assets WHERE fk_site = $1 AND key = $2`,
      [siteUid, parentKey],
    );
    const parent = result.rows[0];
    if (!parent) {
      throw new ConflictException(
        "Typ nicht gefunden oder gehört nicht zum Mandanten",
      );
    }

    if (!isAssetType(parent.type)) {
      throw new ConflictException(
        "Typ hat einen ungültigen Typ",
      );
    }

    if (selfUid && parent.uid === selfUid) {
      throw new ConflictException("Asset kann nicht auf sich selbst verweisen");
    }

    if (!canHostAssetType(parent.type, type)) {
      throw new ConflictException(
        "Typ darf keine Assets einer höheren Hierarchie-Stufe beherbergen",
      );
    }

    if (selfUid) {
      await this.assertNoParentCycle(client, siteUid, selfUid, parent.uid);
    }

    return parent.uid;
  }

  private async assertNoParentCycle(
    client: DbClient,
    siteUid: string,
    selfUid: string,
    parentUid: string,
  ): Promise<void> {
    let current: string | null = parentUid;
    const seen = new Set<string>();

    while (current) {
      if (current === selfUid) {
        throw new ConflictException("Typ würde einen Zyklus erzeugen");
      }
      if (seen.has(current)) {
        return;
      }
      seen.add(current);

      const nextParent: { rows: Array<{ fk_parent: string | null }> } =
        await client.query<{ fk_parent: string | null }>(
          `SELECT fk_parent FROM assets WHERE uid = $1 AND fk_site = $2`,
          [current, siteUid],
        );
      current = nextParent.rows[0]?.fk_parent ?? null;
    }
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function keyChanged(existingKey: string, nextKey: string): boolean {
  return nextKey !== existingKey;
}
