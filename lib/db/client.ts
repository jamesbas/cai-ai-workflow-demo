import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { seedReferenceData } from "@/lib/db/seed";

let instance: Database.Database | null = null;

function schemaSql(): string {
  return fs.readFileSync(path.join(process.cwd(), "lib", "db", "schema.sql"), "utf8");
}

export function getDb(): Database.Database {
  if (instance) return instance;

  const dbPath = path.resolve(config.databasePath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(schemaSql());

  seedReferenceData(db);

  instance = db;
  return db;
}

/** Test/script helper. Closes the cached handle so a new path can be opened. */
export function closeDb(): void {
  instance?.close();
  instance = null;
}
