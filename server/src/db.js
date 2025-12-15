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
    return db;
  })();
  return dbPromise;
}

