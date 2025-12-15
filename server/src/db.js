import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, "..", "data");
const schemaPath = path.resolve(__dirname, "schema.sql");

let dbPromise;

async function migrate(db) {
  const schemaSql = await fs.promises.readFile(schemaPath, "utf-8");
  await db.exec(schemaSql);
}

async function assertTableColumns(db, table, requiredColumns) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  const names = new Set(cols.map((c) => c.name));
  const missing = requiredColumns.filter((c) => !names.has(c));
  if (missing.length) {
    throw new Error(
      `SQLite schema mismatch: table "${table}" missing columns: ${missing.join(
        ", "
      )}. If this is a dev environment, delete the DB file and restart.`
    );
  }
}

async function validateSchema(db) {
  await assertTableColumns(db, "menu", ["id", "parent_id", "name", "code", "sort", "enabled"]);
  await assertTableColumns(db, "permission", [
    "id",
    "parent_id",
    "level",
    "name",
    "code",
    "sort",
    "enabled",
  ]);
  await assertTableColumns(db, "role", ["id", "name", "code", "enabled"]);
  await assertTableColumns(db, "role_menu", ["role_id", "menu_id"]);
  await assertTableColumns(db, "role_permission", ["role_id", "permission_id"]);
}

export async function getDb() {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    await fs.promises.mkdir(dataDir, { recursive: true });
    const dbPath = process.env.DB_PATH || path.join(dataDir, "app.db");
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    await db.exec("PRAGMA foreign_keys = ON;");
    await migrate(db);
    await validateSchema(db);
    return db;
  })();
  return dbPromise;
}
