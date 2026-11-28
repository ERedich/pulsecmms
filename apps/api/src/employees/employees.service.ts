import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService, type DbClient } from "../db/db.service";
import type { CreateEmployeeDto } from "./dto/create-employee.dto";
import type { UpdateEmployeeDto } from "./dto/update-employee.dto";

export type EmployeeRow = {
  uid: string;
  key: string;
  fk_site: string;
  first_name: string;
  last_name: string;
};

export type EmployeePublic = {
  uid: string;
  key: string;
  firstName: string;
  lastName: string;
};

const EMPLOYEE_COLUMNS = "uid, key, fk_site, first_name, last_name";

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DbService) {}

  async listForSite(siteUid: string): Promise<EmployeePublic[]> {
    const result = await this.db.query<EmployeeRow>(
      `SELECT ${EMPLOYEE_COLUMNS}
       FROM employees
       WHERE fk_site = $1
       ORDER BY key`,
      [siteUid],
    );
    return result.rows.map((row) => this.toPublic(row));
  }

  async getForSite(siteUid: string, key: string): Promise<EmployeePublic> {
    const employee = await this.findByKeyInSite(siteUid, key);
    if (!employee) {
      throw new NotFoundException("Mitarbeiter nicht gefunden");
    }
    return this.toPublic(employee);
  }

  async createForSite(
    siteUid: string,
    dto: CreateEmployeeDto,
  ): Promise<EmployeePublic> {
    const key = dto.key.trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    return this.db.transaction(async (client) => {
      await this.assertKeyAvailable(client, siteUid, key);

      const inserted = await client.query<EmployeeRow>(
        `INSERT INTO employees (key, fk_site, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING ${EMPLOYEE_COLUMNS}`,
        [key, siteUid, firstName, lastName],
      );
      const employee = inserted.rows[0];
      if (!employee) {
        throw new Error("Mitarbeiter konnte nicht angelegt werden");
      }
      return this.toPublic(employee);
    });
  }

  async updateForSite(
    siteUid: string,
    currentKey: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeePublic> {
    const key = dto.key.trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    return this.db.transaction(async (client) => {
      const existing = await this.findByKeyInSiteWithClient(
        client,
        siteUid,
        currentKey,
      );
      if (!existing) {
        throw new NotFoundException("Mitarbeiter nicht gefunden");
      }

      if (key !== existing.key) {
        await this.assertKeyAvailable(client, siteUid, key);
      }

      const updated = await client.query<EmployeeRow>(
        `UPDATE employees
         SET key = $1,
             first_name = $2,
             last_name = $3,
             updated_at = NOW()
         WHERE uid = $4
         RETURNING ${EMPLOYEE_COLUMNS}`,
        [key, firstName, lastName, existing.uid],
      );
      const employee = updated.rows[0];
      if (!employee) {
        throw new NotFoundException("Mitarbeiter nicht gefunden");
      }
      return this.toPublic(employee);
    });
  }

  async deleteForSite(siteUid: string, key: string): Promise<void> {
    const employee = await this.findByKeyInSite(siteUid, key);
    if (!employee) {
      throw new NotFoundException("Mitarbeiter nicht gefunden");
    }

    const referenced = await this.db.query<{ uid: string }>(
      `SELECT uid FROM users WHERE fk_employee = $1 LIMIT 1`,
      [employee.uid],
    );
    if ((referenced.rowCount ?? 0) > 0) {
      throw new ConflictException(
        "Mitarbeiter wird noch referenziert und kann nicht gelöscht werden.",
      );
    }

    await this.db.query(`DELETE FROM employees WHERE uid = $1`, [
      employee.uid,
    ]);
  }

  private toPublic(employee: EmployeeRow): EmployeePublic {
    return {
      uid: employee.uid,
      key: employee.key,
      firstName: employee.first_name,
      lastName: employee.last_name,
    };
  }

  private async findByKeyInSite(
    siteUid: string,
    key: string,
  ): Promise<EmployeeRow | null> {
    return this.findByKeyInSiteWithClient(this.db, siteUid, key);
  }

  private async findByKeyInSiteWithClient(
    client: DbClient,
    siteUid: string,
    key: string,
  ): Promise<EmployeeRow | null> {
    const result = await client.query<EmployeeRow>(
      `SELECT ${EMPLOYEE_COLUMNS}
       FROM employees
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
      `SELECT uid FROM employees WHERE fk_site = $1 AND key = $2`,
      [siteUid, key],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("Schlüssel ist bereits vergeben");
    }
  }
}
