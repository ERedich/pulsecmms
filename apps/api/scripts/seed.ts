import { resolve } from "node:path";
import * as argon2 from "argon2";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

/** Dev-only passwords – change in real environments. */
const DEMO_PASSWORD = "PulseDemo1!";
const ADMIN_PASSWORD = "admin";

async function upsertUser(
  client: Client,
  input: {
    key: string;
    fkSite: string;
    loginName: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  },
): Promise<string> {
  const user = await client.query<{ uid: string }>(
    `INSERT INTO users (key, fk_site, login_name, first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (fk_site, login_name) DO UPDATE SET
       key = EXCLUDED.key,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       updated_at = NOW()
     RETURNING uid`,
    [
      input.key,
      input.fkSite,
      input.loginName,
      input.firstName,
      input.lastName,
      input.email,
      input.passwordHash,
    ],
  );
  const uid = user.rows[0]?.uid;
  if (!uid) {
    throw new Error(`Failed to upsert user ${input.loginName}`);
  }
  return uid;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    const primary = await client.query<{ uid: string }>(
      `INSERT INTO sites (key, name, color_code)
       VALUES ('DEMO', 'Demo Werk', '#2563EB')
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         color_code = EXCLUDED.color_code,
         updated_at = NOW()
       RETURNING uid`,
    );
    const primaryUid = primary.rows[0]?.uid;
    if (!primaryUid) {
      throw new Error("Failed to upsert primary site DEMO");
    }

    const secondary = await client.query<{ uid: string }>(
      `INSERT INTO sites (key, name, color_code)
       VALUES ('NORD', 'Werk Nord', '#0D9488')
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         color_code = EXCLUDED.color_code,
         updated_at = NOW()
       RETURNING uid`,
    );
    const secondaryUid = secondary.rows[0]?.uid;
    if (!secondaryUid) {
      throw new Error("Failed to upsert secondary site NORD");
    }

    const demoPasswordHash = await argon2.hash(DEMO_PASSWORD);
    const adminPasswordHash = await argon2.hash(ADMIN_PASSWORD);

    const demoUid = await upsertUser(client, {
      key: "U-0001",
      fkSite: primaryUid,
      loginName: "m.weber",
      firstName: "Max",
      lastName: "Weber",
      email: "m.weber@demo.local",
      passwordHash: demoPasswordHash,
    });

    await upsertUser(client, {
      key: "U-ADMIN",
      fkSite: primaryUid,
      loginName: "admin",
      firstName: "Admin",
      lastName: "User",
      email: "admin@demo.local",
      passwordHash: adminPasswordHash,
    });

    await client.query(
      `INSERT INTO user_secondary_sites (key, fk_site, fk_user, fk_secondary_site)
       VALUES ('USS-0001', $1, $2, $3)
       ON CONFLICT (fk_user, fk_secondary_site) DO NOTHING`,
      [primaryUid, demoUid, secondaryUid],
    );

    const costCenters: Array<{ key: string; name: string }> = [
      { key: "KS-1000", name: "Instandhaltung" },
      { key: "KS-1100", name: "Elektrowerkstatt" },
      { key: "KS-1200", name: "Mechanische Werkstatt" },
      { key: "KS-2000", name: "Produktion" },
      { key: "KS-2100", name: "Montage" },
      { key: "KS-2200", name: "Qualitätssicherung" },
      { key: "KS-3000", name: "Logistik" },
      { key: "KS-3100", name: "Lager und Versand" },
      { key: "KS-4000", name: "Verwaltung" },
      { key: "KS-4100", name: "Arbeitssicherheit" },
    ];

    for (const costCenter of costCenters) {
      await client.query(
        `INSERT INTO cost_centers (key, fk_site, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (fk_site, key) DO UPDATE SET
           name = EXCLUDED.name,
           updated_at = NOW()`,
        [costCenter.key, primaryUid, costCenter.name],
      );
    }

    const employees: Array<{
      key: string;
      firstName: string;
      lastName: string;
    }> = [
      { key: "MA-0001", firstName: "Max", lastName: "Weber" },
      { key: "MA-0002", firstName: "Erika", lastName: "Neumann" },
      { key: "MA-0003", firstName: "Lena", lastName: "Hoffmann" },
      { key: "MA-0004", firstName: "Jonas", lastName: "Keller" },
      { key: "MA-0005", firstName: "Sabine", lastName: "Krüger" },
      { key: "MA-0006", firstName: "Thomas", lastName: "Berger" },
      { key: "MA-0007", firstName: "Aylin", lastName: "Yılmaz" },
      { key: "MA-0008", firstName: "Patrick", lastName: "Schulz" },
      { key: "MA-0009", firstName: "Claudia", lastName: "Vogel" },
      { key: "MA-0010", firstName: "Henrik", lastName: "Bauer" },
    ];

    let employeeWeberUid: string | undefined;
    for (const employee of employees) {
      const inserted = await client.query<{ uid: string }>(
        `INSERT INTO employees (key, fk_site, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (fk_site, key) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           updated_at = NOW()
         RETURNING uid`,
        [employee.key, primaryUid, employee.firstName, employee.lastName],
      );
      if (employee.key === "MA-0001") {
        employeeWeberUid = inserted.rows[0]?.uid;
      }
    }
    if (!employeeWeberUid) {
      throw new Error("Failed to upsert employee MA-0001");
    }

    await client.query(
      `UPDATE users
       SET fk_employee = $1,
           updated_at = NOW()
       WHERE uid = $2`,
      [employeeWeberUid, demoUid],
    );

    const costCenterUid = await client.query<{ uid: string }>(
      `SELECT uid FROM cost_centers WHERE fk_site = $1 AND key = 'KS-1000'`,
      [primaryUid],
    );
    const ks1000Uid = costCenterUid.rows[0]?.uid;
    if (!ks1000Uid) {
      throw new Error("Failed to resolve cost center KS-1000");
    }

    const assetChain: Array<{
      key: string;
      type: string;
      parentKey: string | null;
      serialNumber: string | null;
      manufacturer: string | null;
    }> = [
      {
        key: "AS-LOC-01",
        type: "location",
        parentKey: null,
        serialNumber: null,
        manufacturer: null,
      },
      {
        key: "AS-BLD-01",
        type: "building",
        parentKey: "AS-LOC-01",
        serialNumber: null,
        manufacturer: null,
      },
      {
        key: "AS-AREA-01",
        type: "area",
        parentKey: "AS-BLD-01",
        serialNumber: null,
        manufacturer: null,
      },
      {
        key: "AS-ASM-01",
        type: "assembly",
        parentKey: "AS-AREA-01",
        serialNumber: "SN-ASM-001",
        manufacturer: "Pulse Technik",
      },
      {
        key: "AS-MO-01",
        type: "maintenance_object",
        parentKey: "AS-ASM-01",
        serialNumber: "SN-MO-001",
        manufacturer: "Pulse Technik",
      },
    ];

    const assetUids = new Map<string, string>();
    for (const asset of assetChain) {
      const parentUid = asset.parentKey
        ? assetUids.get(asset.parentKey)
        : null;
      if (asset.parentKey && !parentUid) {
        throw new Error(`Failed to resolve parent asset ${asset.parentKey}`);
      }

      const inserted = await client.query<{ uid: string }>(
        `INSERT INTO assets (
           key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (fk_site, key) DO UPDATE SET
           type = EXCLUDED.type,
           fk_parent = EXCLUDED.fk_parent,
           fk_cost_center = EXCLUDED.fk_cost_center,
           serial_number = EXCLUDED.serial_number,
           manufacturer = EXCLUDED.manufacturer,
           updated_at = NOW()
         RETURNING uid`,
        [
          asset.key,
          primaryUid,
          asset.type,
          parentUid,
          ks1000Uid,
          asset.serialNumber,
          asset.manufacturer,
        ],
      );
      const uid = inserted.rows[0]?.uid;
      if (!uid) {
        throw new Error(`Failed to upsert asset ${asset.key}`);
      }
      assetUids.set(asset.key, uid);
    }

    await client.query("COMMIT");
    console.log("Seed complete:");
    console.log("  sites: DEMO (primary), NORD (secondary)");
    console.log("  user:  m.weber / PulseDemo1! (key U-0001, employee MA-0001)");
    console.log("  user:  admin / admin (key U-ADMIN)");
    console.log(
      "  cost_centers (DEMO): KS-1000, KS-1100, KS-1200, KS-2000, KS-2100, KS-2200, KS-3000, KS-3100, KS-4000, KS-4100",
    );
    console.log(
      "  employees (DEMO): MA-0001 … MA-0010",
    );
    console.log(
      "  assets (DEMO): AS-LOC-01 → AS-BLD-01 → AS-AREA-01 → AS-ASM-01 → AS-MO-01",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
