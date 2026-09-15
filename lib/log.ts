type Level = "info" | "warn" | "error";

const REDACTED_KEYS = /token|authorization|secret|password|key|principal|image|blob/i;

function safeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    output[key] = REDACTED_KEYS.test(key) ? "[redacted]" : value;
  }
  return output;
}

export function log(level: Level, event: string, details: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...safeDetails(details),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
