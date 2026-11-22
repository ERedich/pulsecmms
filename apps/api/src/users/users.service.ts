import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { DbService, type DbClient } from "../db/db.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

export type UserRow = {
  uid: string;
  key: string;
  fk_site: string;
  fk_employee: string | null;
  login_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  password_hash: string;
};

export type SiteRef = {
  key: string;
  name: string;
  colorCode: string;
};

export type EmployeeRef = {
  key: string;
  firstName: string;
  lastName: string;
};

export type EmployeeOption = EmployeeRef & {
  assignedUserKey: string | null;
};

type SiteDbRef = {
  key: string;
  name: string;
  color_code: string;
};

export type SiteRow = SiteDbRef & {
  uid: string;
};

type EmployeeDbRef = {
  uid: string;
  key: string;
  first_name: string;
  last_name: string;
};

export type UserPublic = {
  key: string;
  loginName: string;
  firstName: string;
  lastName: string;
  email: string;
  primarySite: SiteRef;
  secondarySites: SiteRef[];
  employee: EmployeeRef | null;
};

const USER_COLUMNS =
  "uid, key, fk_site, fk_employee, login_name, first_name, last_name, email, password_hash";

function secondaryLinkKey(userKey: string, siteKey: string): string {
  return `USS-${userKey}-${siteKey}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  async findByLoginName(loginName: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE login_name = $1
       LIMIT 2`,
      [loginName],
    );

    if ((result.rowCount ?? 0) !== 1) {
      return null;
    }

    return result.rows[0] ?? null;
  }

  async findByUid(uid: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE uid = $1`,
      [uid],
    );
    return result.rows[0] ?? null;
  }

  async toPublic(user: UserRow): Promise<UserPublic> {
    return this.toPublicWithClient(this.db, user);
  }

  async listForSite(siteUid: string): Promise<UserPublic[]> {
    const users = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
       WHERE fk_site = $1
       ORDER BY key`,
      [siteUid],
    );

    const result: UserPublic[] = [];
    for (const user of users.rows) {
      result.push(await this.toPublic(user));
    }
    return result;
  }

  async getForSite(siteUid: string, key: string): Promise<UserPublic> {
    const user = await this.findByKeyInSite(siteUid, key);
    if (!user) {
      throw new NotFoundException("Benutzer nicht gefunden");
    }
    return this.toPublic(user);
  }

  async listSecondarySiteOptions(siteUid: string): Promise<SiteRef[]> {
    const result = await this.db.query<SiteDbRef>(
      `SELECT key, name, color_code
       FROM sites
       WHERE uid <> $1
       ORDER BY key`,
      [siteUid],
    );
    return result.rows.map((row) => this.toSiteRef(row));
  }

  async listEmployeeOptions(siteUid: string): Promise<EmployeeOption[]> {
    const result = await this.db.query<{
      key: string;
      first_name: string;
      last_name: string;
      assigned_user_key: string | null;
    }>(
      `SELECT e.key,
              e.first_name,
              e.last_name,
              u.key AS assigned_user_key
       FROM employees e
       LEFT JOIN users u ON u.fk_employee = e.uid
       WHERE e.fk_site = $1
       ORDER BY e.key`,
      [siteUid],
    );

    return result.rows.map((row) => ({
      key: row.key,
      firstName: row.first_name,
      lastName: row.last_name,
      assignedUserKey: row.assigned_user_key,
    }));
  }

  async createForSite(
    siteUid: string,
    dto: CreateUserDto,
  ): Promise<UserPublic> {
    const key = dto.key.trim();
    const loginName = dto.loginName.trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const email = dto.email.trim().toLowerCase();
    const secondarySiteKeys = this.normalizeSecondaryKeys(dto.secondarySiteKeys);

    return this.db.transaction(async (client) => {
      await this.assertKeyAvailable(client, siteUid, key);
      await this.assertLoginNameAvailable(client, loginName);
      await this.assertEmailAvailable(client, email);
      const secondarySites = await this.resolveSecondarySites(
        client,
        siteUid,
        secondarySiteKeys,
      );
      const employeeUid = await this.resolveEmployeeUid(
        client,
        siteUid,
        dto.employeeKey,
      );

      const passwordHash = await argon2.hash(dto.password);
      const inserted = await client.query<UserRow>(
        `INSERT INTO users (key, fk_site, fk_employee, login_name, first_name, last_name, email, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${USER_COLUMNS}`,
        [
          key,
          siteUid,
          employeeUid,
          loginName,
          firstName,
          lastName,
          email,
          passwordHash,
        ],
      );
      const user = inserted.rows[0];
      if (!user) {
        throw new Error("Benutzer konnte nicht angelegt werden");
      }

      await this.replaceSecondarySites(client, siteUid, user, secondarySites);
      return this.toPublicWithClient(client, user);
    });
  }

  async updateForSite(
    siteUid: string,
    currentKey: string,
    dto: UpdateUserDto,
  ): Promise<UserPublic> {
    const key = dto.key.trim();
    const loginName = dto.loginName.trim();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const email = dto.email.trim().toLowerCase();
    const secondarySiteKeys = this.normalizeSecondaryKeys(dto.secondarySiteKeys);
    const password = dto.password?.trim() ?? "";

    return this.db.transaction(async (client) => {
      const existing = await this.findByKeyInSiteWithClient(
        client,
        siteUid,
        currentKey,
      );
      if (!existing) {
        throw new NotFoundException("Benutzer nicht gefunden");
      }

      if (key !== existing.key) {
        await this.assertKeyAvailable(client, siteUid, key);
      }
      if (loginName !== existing.login_name) {
        await this.assertLoginNameAvailable(client, loginName);
      }
      if (email !== existing.email) {
        await this.assertEmailAvailable(client, email);
      }

      const secondarySites = await this.resolveSecondarySites(
        client,
        siteUid,
        secondarySiteKeys,
      );
      const employeeUid = await this.resolveEmployeeUid(
        client,
        siteUid,
        dto.employeeKey,
        existing.uid,
      );

      const passwordHash =
        password.length > 0
          ? await argon2.hash(password)
          : existing.password_hash;

      const updated = await client.query<UserRow>(
        `UPDATE users
         SET key = $1,
             login_name = $2,
             first_name = $3,
             last_name = $4,
             email = $5,
             password_hash = $6,
             fk_employee = $7,
             updated_at = NOW()
         WHERE uid = $8
         RETURNING ${USER_COLUMNS}`,
        [
          key,
          loginName,
          firstName,
          lastName,
          email,
          passwordHash,
          employeeUid,
          existing.uid,
        ],
      );
      const user = updated.rows[0];
      if (!user) {
        throw new NotFoundException("Benutzer nicht gefunden");
      }

      await this.replaceSecondarySites(client, siteUid, user, secondarySites);
      return this.toPublicWithClient(client, user);
    });
  }

  async deleteForSite(
    siteUid: string,
    key: string,
    actorUid: string,
  ): Promise<void> {
    const user = await this.findByKeyInSite(siteUid, key);
    if (!user) {
      throw new NotFoundException("Benutzer nicht gefunden");
    }
    if (user.uid === actorUid) {
      throw new ForbiddenException("Eigenen Benutzer kann man nicht löschen");
    }

    await this.db.query(`DELETE FROM users WHERE uid = $1`, [user.uid]);
  }

  private normalizeSecondaryKeys(keys: string[]): string[] {
    return [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  }

  private async findByKeyInSite(
    siteUid: string,
    key: string,
  ): Promise<UserRow | null> {
    return this.findByKeyInSiteWithClient(this.db, siteUid, key);
  }

  private async findByKeyInSiteWithClient(
    client: DbClient,
    siteUid: string,
    key: string,
  ): Promise<UserRow | null> {
    const result = await client.query<UserRow>(
      `SELECT ${USER_COLUMNS}
       FROM users
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
      `SELECT uid FROM users WHERE fk_site = $1 AND key = $2`,
      [siteUid, key],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("Benutzerschlüssel ist bereits vergeben");
    }
  }

  private async assertLoginNameAvailable(
    client: DbClient,
    loginName: string,
  ): Promise<void> {
    const result = await client.query<{ uid: string }>(
      `SELECT uid FROM users WHERE login_name = $1`,
      [loginName],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("Login-Name ist bereits vergeben");
    }
  }

  private async assertEmailAvailable(
    client: DbClient,
    email: string,
  ): Promise<void> {
    const result = await client.query<{ uid: string }>(
      `SELECT uid FROM users WHERE email = $1`,
      [email],
    );
    if ((result.rowCount ?? 0) > 0) {
      throw new ConflictException("E-Mail ist bereits vergeben");
    }
  }

  private async resolveEmployeeUid(
    client: DbClient,
    siteUid: string,
    employeeKey: string | null,
    currentUserUid?: string,
  ): Promise<string | null> {
    if (employeeKey === null || employeeKey.trim().length === 0) {
      return null;
    }

    const key = employeeKey.trim();
    const employee = await client.query<EmployeeDbRef>(
      `SELECT uid, key, first_name, last_name
       FROM employees
       WHERE fk_site = $1 AND key = $2`,
      [siteUid, key],
    );
    const row = employee.rows[0];
    if (!row) {
      throw new NotFoundException("Mitarbeiter nicht gefunden");
    }

    const assigned = await client.query<{ uid: string }>(
      `SELECT uid FROM users
       WHERE fk_employee = $1
         AND ($2::uuid IS NULL OR uid <> $2)
       LIMIT 1`,
      [row.uid, currentUserUid ?? null],
    );
    if ((assigned.rowCount ?? 0) > 0) {
      throw new ConflictException(
        "Mitarbeiter ist bereits einem anderen Benutzer zugeordnet",
      );
    }

    return row.uid;
  }

  private async resolveSecondarySites(
    client: DbClient,
    primarySiteUid: string,
    secondarySiteKeys: string[],
  ): Promise<SiteRow[]> {
    if (secondarySiteKeys.length === 0) {
      return [];
    }

    const result = await client.query<SiteRow>(
      `SELECT uid, key, name, color_code
       FROM sites
       WHERE key = ANY($1::text[])`,
      [secondarySiteKeys],
    );

    const byKey = new Map(result.rows.map((site) => [site.key, site]));
    const resolved: SiteRow[] = [];

    for (const key of secondarySiteKeys) {
      const site = byKey.get(key);
      if (!site) {
        throw new NotFoundException(`Nebenmandant ${key} nicht gefunden`);
      }
      if (site.uid === primarySiteUid) {
        throw new ConflictException(
          "Nebenmandant darf nicht dem Hauptmandanten entsprechen",
        );
      }
      resolved.push(site);
    }

    return resolved;
  }

  private async replaceSecondarySites(
    client: DbClient,
    primarySiteUid: string,
    user: UserRow,
    secondarySites: SiteRow[],
  ): Promise<void> {
    await client.query(`DELETE FROM user_secondary_sites WHERE fk_user = $1`, [
      user.uid,
    ]);

    for (const site of secondarySites) {
      await client.query(
        `INSERT INTO user_secondary_sites (key, fk_site, fk_user, fk_secondary_site)
         VALUES ($1, $2, $3, $4)`,
        [
          secondaryLinkKey(user.key, site.key),
          primarySiteUid,
          user.uid,
          site.uid,
        ],
      );
    }
  }

  private toSiteRef(row: SiteDbRef): SiteRef {
    return {
      key: row.key,
      name: row.name,
      colorCode: row.color_code.trim().toUpperCase(),
    };
  }

  private async toPublicWithClient(
    client: DbClient,
    user: UserRow,
  ): Promise<UserPublic> {
    const primary = await client.query<SiteDbRef>(
      `SELECT key, name, color_code FROM sites WHERE uid = $1`,
      [user.fk_site],
    );
    const primaryRow = primary.rows[0];
    if (!primaryRow) {
      throw new Error(`Primary site missing for user ${user.key}`);
    }

    const secondary = await client.query<SiteDbRef>(
      `SELECT s.key, s.name, s.color_code
       FROM user_secondary_sites uss
       INNER JOIN sites s ON s.uid = uss.fk_secondary_site
       WHERE uss.fk_user = $1
       ORDER BY s.key`,
      [user.uid],
    );

    let employee: EmployeeRef | null = null;
    if (user.fk_employee) {
      const employeeResult = await client.query<{
        key: string;
        first_name: string;
        last_name: string;
      }>(
        `SELECT key, first_name, last_name
         FROM employees
         WHERE uid = $1`,
        [user.fk_employee],
      );
      const employeeRow = employeeResult.rows[0];
      if (employeeRow) {
        employee = {
          key: employeeRow.key,
          firstName: employeeRow.first_name,
          lastName: employeeRow.last_name,
        };
      }
    }

    return {
      key: user.key,
      loginName: user.login_name,
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      email: user.email,
      primarySite: this.toSiteRef(primaryRow),
      secondarySites: secondary.rows.map((row) => this.toSiteRef(row)),
      employee,
    };
  }
}
