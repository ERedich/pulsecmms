import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService } from "../db/db.service";
import {
  findCatalogEntry,
  SETTING_CATALOG,
  type SettingCatalogEntry,
} from "./setting-catalog";
import type { UpdateSettingDto } from "./dto/update-setting.dto";

type SettingRow = {
  uid: string;
  key: string;
  fk_site: string | null;
  value: unknown;
};

export type SettingPublic = {
  uid: string | null;
  key: string;
  name: string;
  description: string;
  explanation: string;
  category: SettingCatalogEntry["category"];
  scope: SettingCatalogEntry["scope"];
  valueType: SettingCatalogEntry["valueType"];
  value: number;
};

const SETTING_COLUMNS = "uid, key, fk_site, value";

@Injectable()
export class SettingsService {
  constructor(private readonly db: DbService) {}

  async listForSite(siteUid: string): Promise<SettingPublic[]> {
    const stored = await this.loadStoredForSite(siteUid);
    return SETTING_CATALOG.map((entry) =>
      this.toPublic(entry, stored.get(this.storageKey(entry, siteUid))),
    );
  }

  async getForSite(siteUid: string, key: string): Promise<SettingPublic> {
    const entry = findCatalogEntry(key);
    if (!entry) {
      throw new NotFoundException("Einstellung nicht gefunden");
    }
    const row = await this.findStored(entry, siteUid);
    return this.toPublic(entry, row);
  }

  async updateForSite(
    siteUid: string,
    key: string,
    dto: UpdateSettingDto,
  ): Promise<SettingPublic> {
    const entry = findCatalogEntry(key);
    if (!entry) {
      throw new NotFoundException("Einstellung nicht gefunden");
    }

    const value = this.parseValue(entry, dto.value);

    if (entry.scope === "global") {
      const upserted = await this.db.query<SettingRow>(
        `INSERT INTO settings (key, fk_site, value)
         VALUES ($1, NULL, $2::jsonb)
         ON CONFLICT (key) WHERE fk_site IS NULL
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
         RETURNING ${SETTING_COLUMNS}`,
        [entry.key, JSON.stringify(value)],
      );
      const row = upserted.rows[0];
      if (!row) {
        throw new Error("Einstellung konnte nicht gespeichert werden");
      }
      return this.toPublic(entry, row);
    }

    const upserted = await this.db.query<SettingRow>(
      `INSERT INTO settings (key, fk_site, value)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (fk_site, key) WHERE fk_site IS NOT NULL
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING ${SETTING_COLUMNS}`,
      [entry.key, siteUid, JSON.stringify(value)],
    );
    const row = upserted.rows[0];
    if (!row) {
      throw new Error("Einstellung konnte nicht gespeichert werden");
    }
    return this.toPublic(entry, row);
  }

  private async loadStoredForSite(
    siteUid: string,
  ): Promise<Map<string, SettingRow>> {
    const result = await this.db.query<SettingRow>(
      `SELECT ${SETTING_COLUMNS}
       FROM settings
       WHERE fk_site IS NULL OR fk_site = $1`,
      [siteUid],
    );
    const map = new Map<string, SettingRow>();
    for (const row of result.rows) {
      const entry = findCatalogEntry(row.key);
      if (!entry) continue;
      map.set(this.storageKey(entry, siteUid), row);
    }
    return map;
  }

  private async findStored(
    entry: SettingCatalogEntry,
    siteUid: string,
  ): Promise<SettingRow | null> {
    if (entry.scope === "global") {
      const result = await this.db.query<SettingRow>(
        `SELECT ${SETTING_COLUMNS}
         FROM settings
         WHERE key = $1 AND fk_site IS NULL`,
        [entry.key],
      );
      return result.rows[0] ?? null;
    }

    const result = await this.db.query<SettingRow>(
      `SELECT ${SETTING_COLUMNS}
       FROM settings
       WHERE key = $1 AND fk_site = $2`,
      [entry.key, siteUid],
    );
    return result.rows[0] ?? null;
  }

  private storageKey(entry: SettingCatalogEntry, siteUid: string): string {
    return entry.scope === "global"
      ? `global:${entry.key}`
      : `site:${siteUid}:${entry.key}`;
  }

  private toPublic(
    entry: SettingCatalogEntry,
    row: SettingRow | null | undefined,
  ): SettingPublic {
    const value =
      row != null
        ? this.readStoredNumber(entry, row.value)
        : entry.defaultValue;

    return {
      uid: row?.uid ?? null,
      key: entry.key,
      name: entry.name,
      description: entry.description,
      explanation: entry.explanation,
      category: entry.category,
      scope: entry.scope,
      valueType: entry.valueType,
      value,
    };
  }

  private parseValue(entry: SettingCatalogEntry, raw: unknown): number {
    if (entry.valueType !== "number") {
      throw new BadRequestException("Unbekannter Einstellungstyp");
    }

    const numberValue =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw.trim().replace(",", "."))
          : Number.NaN;

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      throw new BadRequestException(
        "Wert muss eine Zahl größer als 0 sein",
      );
    }

    return numberValue;
  }

  private readStoredNumber(
    entry: SettingCatalogEntry,
    raw: unknown,
  ): number {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw.trim().replace(",", "."));
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return entry.defaultValue;
  }
}
