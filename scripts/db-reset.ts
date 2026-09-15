import { loadEnv } from "./env";

loadEnv();

async function main() {
  const { getDb } = await import("../lib/db/client");
  const { deleteGeneratedCases } = await import("../lib/db/repositories");
  const { seedReferenceData } = await import("../lib/db/seed");

  const db = getDb();
  const removed = deleteGeneratedCases();
  seedReferenceData(db);

  console.log(
    `Reset complete. Removed ${removed.cases} case(s) and ${removed.auditEvents} audit event(s). Reference data reseeded.`,
  );
}

void main();
