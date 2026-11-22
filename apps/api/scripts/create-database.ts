import { config } from "dotenv";
import { resolve } from "node:path";
import { Client } from "pg";

config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../../../.env") });

const DB_NAME = "pulse_dev";
const ADMIN_URL =
  process.env.POSTGRES_ADMIN_URL ??
  "postgresql://postgres@192.168.178.106:41631/postgres";

async function main() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();

  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME],
    );

    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`Created database ${DB_NAME}`);
    } else {
      console.log(`Database ${DB_NAME} already exists`);
    }

    const encoding = await admin.query<{ encoding: string }>(
      `SELECT pg_encoding_to_char(encoding) AS encoding
       FROM pg_database
       WHERE datname = $1`,
      [DB_NAME],
    );

    const value = encoding.rows[0]?.encoding;
    if (value !== "UTF8") {
      console.error(
        `Encoding of ${DB_NAME} is ${value ?? "unknown"}, expected UTF8. Aborting.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Encoding of ${DB_NAME}: UTF8`);
  } finally {
    await admin.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
