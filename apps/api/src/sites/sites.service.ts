import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService, type DbClient } from "../db/db.service";
import type { CreateSiteDto } from "./dto/create-site.dto";
import type { UpdateSiteDto } from "./dto/update-site.dto";

export type SiteRow = {
  uid: string;
  key: string;
  name: string;
  color_code: string;
};

export type SitePublic = {
  uid: string;
  key: string;
  name: string;
  colorCode: string;
};

const SITE_COLUMNS = "uid, key, name, color_code";

function secondaryLinkKey(userKey: string, siteKey: string): string {
  return `USS-${userKey}-${siteKey}`;
}

function normalizeColorCode(value: string): string {
  return value.trim().toUpperCase();
}

@Injectable()
export class SitesService {
  constructor(private readonly db: DbService) {}

  async list(): Promise<SitePublic[]> {
    const result = await this.db.query<SiteRow>(
      `SELECT ${SITE_COLUMNS}
       FROM sites
       ORDER BY key`,
    );
    return result.rows.map((row) => this.toPublic(row));
  }

  async getByKey(key: string): Promise<SitePublic> {
    const site = await this.findByKey(key);
    if (!site) {
      throw new NotFoundException("Mandant nicht gefunden");
    }
    return this.toPublic(site);
  }

  async create(dto: CreateSiteDto): Promise<SitePublic> {
    const key = dto.key.trim();
    const name = dto.name.trim();
    const colorCode = normalizeColorCode(dto.colorCode);

    return this.db.transaction(async (client) => {
      await this.assertKeyAvailable(client, key);

      const inserted = await client.query<SiteRow>(
        `INSERT INTO sites (key, name, color_code)
         VALUES ($1, $2, $3)
         RETURNING ${SITE_COLUMNS}`,
        [key, name, colorCode],
      );
      const site = inserted.rows[0];
      if (!site) {
        throw new Error("Mandant konnte nicht angelegt werden");
      }
      return this.toPublic(site);
    });
  }

  async update(currentKey: string, dto: UpdateSiteDto): Promise<SitePublic> {
    const key = dto.key.trim();
    const name = dto.name.trim();
    const colorCode = normalizeColorCode(dto.colorCode);

    return this.db.transaction(async (client) => {
      const existing = await this.findByKeyWithClient(client, currentKey);
      if (!existing) {
        throw new NotFoundException("Mandant nicht gefunden");
      }

      if (key !== existing.key) {
        await this.assertKeyAvailable(client, key);
      }

      const updated = await client.query<SiteRow>(
        `UPDATE sites
         SET key = $1,
             name = $2,
             color_code = $3,
             updated_at = NOW()
         WHERE uid = $4
         RETURNING ${SITE_COLUMNS}`,
        [key, name, colorCode, existing.uid],
      );
      const site = updated.rows[0];
      if (!site) {
        throw new NotFoundException("Mandant nicht gefunden");
      }

      if (key !== existing.key) {
        await this.syncSecondaryLinkKeys(client, site);
      }

      return this.toPublic(site);
    });
  }

  async delete(key: string): Promise<void> {
    const site = await this.findByKey(key);
    if (!site) {
      throw new NotFoundException("Mandant nicht gefunden");
    }

    const referenced = await this.isReferenced(site.uid);
    if (referenced) {
      throw new ConflictException(
        "Mandant wird noch referenziert und kann nicht gelöscht werden.",
      );
    }

    await this.db.query(`DELETE FROM sites WHERE uid = $1`, [site.uid]);
  }

  private toPublic(site: SiteRow): SitePublic {
    return {
      uid: site.uid,
      key: site.key,
      name: site.name,
      colorCode: normalizeColorCode(site.color_code),
    };
  }

  private async findByKey(key: string): Promise<SiteRow | null> {
    return this.findByKeyWithClient(this.db, key);
  }

  private async findByKeyWithClient(
    client: DbClient,
    key: string,
  ): Promise<SiteRow | null> {
    const result = await client.query<SiteRow>(
      `SELECT ${SITE_COLUMNS}
       FROM sites
       WHERE key = $1`,
      [key],
    );
    return result.rows[0] ?? null;
  }

  private async assertKeyAvailable(
    client: DbClient,
    key: string,
  ): Promise<void> {
    const result = await client.query<{ uid: string }>(
      `SELECT uid FROM sites WHERE key = $1`,
      [key],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("Mandantenschlüssel ist bereits vergeben");
    }
  }

  private async isReferenced(siteUid: string): Promise<boolean> {
    const users = await this.db.query<{ uid: string }>(
      `SELECT uid FROM users WHERE fk_site = $1 LIMIT 1`,
      [siteUid],
    );
    if ((users.rowCount ?? 0) > 0) {
      return true;
    }

    const asPrimary = await this.db.query<{ uid: string }>(
      `SELECT uid FROM user_secondary_sites WHERE fk_site = $1 LIMIT 1`,
      [siteUid],
    );
    if ((asPrimary.rowCount ?? 0) > 0) {
      return true;
    }

    const asSecondary = await this.db.query<{ uid: string }>(
      `SELECT uid FROM user_secondary_sites WHERE fk_secondary_site = $1 LIMIT 1`,
      [siteUid],
    );
    if ((asSecondary.rowCount ?? 0) > 0) {
      return true;
    }

    const costCenters = await this.db.query<{ uid: string }>(
      `SELECT uid FROM cost_centers WHERE fk_site = $1 LIMIT 1`,
      [siteUid],
    );
    if ((costCenters.rowCount ?? 0) > 0) {
      return true;
    }

    const employees = await this.db.query<{ uid: string }>(
      `SELECT uid FROM employees WHERE fk_site = $1 LIMIT 1`,
      [siteUid],
    );
    if ((employees.rowCount ?? 0) > 0) {
      return true;
    }

    const assets = await this.db.query<{ uid: string }>(
      `SELECT uid FROM assets WHERE fk_site = $1 LIMIT 1`,
      [siteUid],
    );
    if ((assets.rowCount ?? 0) > 0) {
      return true;
    }

    const settings = await this.db.query<{ uid: string }>(
      `SELECT uid FROM settings WHERE fk_site = $1 LIMIT 1`,
      [siteUid],
    );
    return (settings.rowCount ?? 0) > 0;
  }

  private async syncSecondaryLinkKeys(
    client: DbClient,
    site: SiteRow,
  ): Promise<void> {
    const links = await client.query<{ uid: string; user_key: string }>(
      `SELECT uss.uid, u.key AS user_key
       FROM user_secondary_sites uss
       INNER JOIN users u ON u.uid = uss.fk_user
       WHERE uss.fk_secondary_site = $1`,
      [site.uid],
    );

    for (const link of links.rows) {
      await client.query(
        `UPDATE user_secondary_sites
         SET key = $1,
             updated_at = NOW()
         WHERE uid = $2`,
        [secondaryLinkKey(link.user_key, site.key), link.uid],
      );
    }
  }
}
