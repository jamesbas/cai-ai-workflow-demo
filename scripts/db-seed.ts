import { loadEnv } from "./env";

loadEnv();

async function main() {
  const { getDb } = await import("../lib/db/client");
  const { seedReferenceData } = await import("../lib/db/seed");

  const db = getDb();
  seedReferenceData(db);

  const counts = [
    "communities",
    "residents",
    "vendors",
    "assets",
    "maintenance_history",
    "sla_rules",
  ]
    .map((table) => {
      const row = db.prepare<[], { count: number }>(`SELECT COUNT(*) AS count FROM ${table}`).get();
      return `${table}=${row?.count ?? 0}`;
    })
    .join(" ");

  console.log(`Seed complete. ${counts}`);
}

void main();
