import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService, type DbClient } from "../db/db.service";
import type { CreateCostCenterDto } from "./dto/create-cost-center.dto";
import type { UpdateCostCenterDto } from "./dto/update-cost-center.dto";

export type CostCenterRow = {
  uid: string;
  key: string;
  fk_site: string;
  name: string;
};

export type CostCenterPublic = {
  key: string;
  name: string;
};

const COST_CENTER_COLUMNS = "uid, key, fk_site, name";

@Injectable()
export class CostCentersService {
  constructor(private readonly db: DbService) {}

  async listForSite(siteUid: string): Promise<CostCenterPublic[]> {
    const result = await this.db.query<CostCenterRow>(
      `SELECT ${COST_CENTER_COLUMNS}
       FROM cost_centers
       WHERE fk_site = $1
       ORDER BY key`,
      [siteUid],
    );
    return result.rows.map((row) => this.toPublic(row));
  }

  async getForSite(siteUid: string, key: string): Promise<CostCenterPublic> {
    const costCenter = await this.findByKeyInSite(siteUid, key);
    if (!costCenter) {
      throw new NotFoundException("Kostenstelle nicht gefunden");
    }
    return this.toPublic(costCenter);
  }

  async createForSite(
    siteUid: string,
    dto: CreateCostCenterDto,
  ): Promise<CostCenterPublic> {
    const key = dto.key.trim();
    const name = dto.name.trim();

    return this.db.transaction(async (client) => {
      await this.assertKeyAvailable(client, siteUid, key);

      const inserted = await client.query<CostCenterRow>(
        `INSERT INTO cost_centers (key, fk_site, name)
         VALUES ($1, $2, $3)
         RETURNING ${COST_CENTER_COLUMNS}`,
        [key, siteUid, name],
      );
      const costCenter = inserted.rows[0];
      if (!costCenter) {
        throw new Error("Kostenstelle konnte nicht angelegt werden");
      }
      return this.toPublic(costCenter);
    });
  }

  async updateForSite(
    siteUid: string,
    currentKey: string,
    dto: UpdateCostCenterDto,
  ): Promise<CostCenterPublic> {
    const key = dto.key.trim();
    const name = dto.name.trim();

    return this.db.transaction(async (client) => {
      const existing = await this.findByKeyInSiteWithClient(
        client,
        siteUid,
        currentKey,
      );
      if (!existing) {
        throw new NotFoundException("Kostenstelle nicht gefunden");
      }

      if (key !== existing.key) {
        await this.assertKeyAvailable(client, siteUid, key);
      }

      const updated = await client.query<CostCenterRow>(
        `UPDATE cost_centers
         SET key = $1,
             name = $2,
             updated_at = NOW()
         WHERE uid = $3
         RETURNING ${COST_CENTER_COLUMNS}`,
        [key, name, existing.uid],
      );
      const costCenter = updated.rows[0];
      if (!costCenter) {
        throw new NotFoundException("Kostenstelle nicht gefunden");
      }
      return this.toPublic(costCenter);
    });
  }

  async deleteForSite(siteUid: string, key: string): Promise<void> {
    const costCenter = await this.findByKeyInSite(siteUid, key);
    if (!costCenter) {
      throw new NotFoundException("Kostenstelle nicht gefunden");
    }

    await this.db.query(`DELETE FROM cost_centers WHERE uid = $1`, [
      costCenter.uid,
    ]);
  }

  private toPublic(costCenter: CostCenterRow): CostCenterPublic {
    return {
      key: costCenter.key,
      name: costCenter.name,
    };
  }

  private async findByKeyInSite(
    siteUid: string,
    key: string,
  ): Promise<CostCenterRow | null> {
    return this.findByKeyInSiteWithClient(this.db, siteUid, key);
  }

  private async findByKeyInSiteWithClient(
    client: DbClient,
    siteUid: string,
    key: string,
  ): Promise<CostCenterRow | null> {
    const result = await client.query<CostCenterRow>(
      `SELECT ${COST_CENTER_COLUMNS}
       FROM cost_centers
       WHERE fk_site = $1 AND key = $2`,
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
      `SELECT uid FROM cost_centers WHERE fk_site = $1 AND key = $2`,
      [siteUid, key],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("Schlüssel ist bereits vergeben");
    }
  }
}
