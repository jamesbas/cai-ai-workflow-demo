function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  databasePath: process.env.DATABASE_PATH ?? "./data/cai-demo2.db",
  foundryProjectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT ?? "",
  foundryModel: process.env.FOUNDRY_MODEL ?? "gpt-5.6-terra",
  /** Optional vision-capable deployment used for AI Call 1 only. */
  foundryVisionModel: process.env.FOUNDRY_VISION_MODEL || undefined,
  demoMode: bool(process.env.DEMO_MODE, true),
  externalDispatchEnabled: bool(process.env.DEMO_EXTERNAL_DISPATCH, false),
  aiTimeoutMs: int(process.env.DEMO_AI_TIMEOUT_MS, 20000),
  fixtureMode: bool(process.env.DEMO_FIXTURE_MODE, false),
  appTitle: process.env.NEXT_PUBLIC_APP_TITLE ?? "CAI Connected Maintenance Demo",
} as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
