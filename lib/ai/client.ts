import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import OpenAI from "openai";
import { config } from "@/lib/config";

const FOUNDRY_SCOPE = "https://ai.azure.com/.default";

let cachedTokenProvider: (() => Promise<string>) | null = null;

function tokenProvider(): () => Promise<string> {
  if (!cachedTokenProvider) {
    const credential = new DefaultAzureCredential({
      tenantId: process.env.AZURE_TENANT_ID || undefined,
    });
    cachedTokenProvider = getBearerTokenProvider(credential, FOUNDRY_SCOPE);
  }
  return cachedTokenProvider;
}

export function foundryBaseUrl(): string {
  if (!config.foundryProjectEndpoint) {
    throw new Error("FOUNDRY_PROJECT_ENDPOINT is not configured.");
  }
  return `${config.foundryProjectEndpoint.replace(/\/+$/, "")}/openai/v1`;
}

/**
 * A fresh client per call. The credential caches and refreshes the Entra token,
 * and no API key is ever read or stored.
 */
export async function getAiClient(): Promise<OpenAI> {
  const token = await tokenProvider()();
  return new OpenAI({
    baseURL: foundryBaseUrl(),
    apiKey: token,
    timeout: config.aiTimeoutMs,
    maxRetries: 1,
  });
}

let connectivity: { ok: boolean; checkedAt: number; detail: string } | null = null;
const CONNECTIVITY_TTL_MS = 60_000;

/** Token acquisition only — health checks never run a model inference. */
export async function checkFoundryConnectivity(): Promise<{ ok: boolean; detail: string }> {
  if (config.fixtureMode) return { ok: true, detail: "fixture mode" };
  if (connectivity && Date.now() - connectivity.checkedAt < CONNECTIVITY_TTL_MS) {
    return { ok: connectivity.ok, detail: connectivity.detail };
  }
  try {
    foundryBaseUrl();
    await tokenProvider()();
    connectivity = { ok: true, checkedAt: Date.now(), detail: "entra token acquired" };
  } catch (error) {
    connectivity = {
      ok: false,
      checkedAt: Date.now(),
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }
  return { ok: connectivity.ok, detail: connectivity.detail };
}
