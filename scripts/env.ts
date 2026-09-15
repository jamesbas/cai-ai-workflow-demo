import fs from "node:fs";
import path from "node:path";

/** Loads .env.local then .env without adding a runtime dependency. */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    try {
      process.loadEnvFile(full);
    } catch {
      // Node without loadEnvFile support, or malformed file: ignore.
    }
  }
}
