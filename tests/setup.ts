import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "cai-demo2.test.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${dbPath}${suffix}`;
  if (fs.existsSync(file)) fs.rmSync(file);
}

process.env.DATABASE_PATH = dbPath;
process.env.DEMO_MODE = "true";
process.env.DEMO_EXTERNAL_DISPATCH = "false";
process.env.DEMO_FIXTURE_MODE = "true";
process.env.FOUNDRY_PROJECT_ENDPOINT =
  "https://example.invalid/api/projects/test-project";
process.env.FOUNDRY_MODEL = "test-model";
