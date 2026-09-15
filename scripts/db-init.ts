import { loadEnv } from "./env";

loadEnv();

async function main() {
  const { getDb } = await import("../lib/db/client");
  const { config } = await import("../lib/config");

  const db = getDb();
  const tables = db
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => row.name);

  console.log(`Database initialized at ${config.databasePath}`);
  console.log(`Tables: ${tables.join(", ")}`);
}

void main();
