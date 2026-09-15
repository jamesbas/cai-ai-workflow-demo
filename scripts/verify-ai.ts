import { loadEnv } from "./env";

loadEnv();

const FOUNDRY_SCOPE = "https://ai.azure.com/.default";

// 1x1 red pixel PNG.
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function fail(step: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFAILED at: ${step}`);
  console.error(message);
  console.error(
    "\nChecks:\n" +
      "  - az login --tenant <tenant that owns the Foundry project>\n" +
      "  - az account set --subscription <your-subscription-id>\n" +
      "  - FOUNDRY_PROJECT_ENDPOINT and FOUNDRY_MODEL are set (.env.local)\n" +
      "  - your identity has the Foundry User role on the project\n",
  );
  process.exit(1);
}

async function main() {
  const { DefaultAzureCredential, getBearerTokenProvider } = await import("@azure/identity");
  const { default: OpenAI } = await import("openai");
  const { config } = await import("../lib/config");
  const { MAINTENANCE_ANALYSIS_JSON_SCHEMA, MaintenanceAnalysisSchema } = await import(
    "../lib/ai/schemas"
  );

  const baseURL = `${config.foundryProjectEndpoint.replace(/\/+$/, "")}/openai/v1`;
  console.log(`Endpoint : ${baseURL}`);
  console.log(`Model    : ${config.foundryModel}`);
  console.log(`Vision   : ${config.foundryVisionModel ?? config.foundryModel}`);

  // Step 1 — Entra token
  let token: string;
  try {
    const credential = new DefaultAzureCredential({
      tenantId: process.env.AZURE_TENANT_ID || undefined,
    });
    token = await getBearerTokenProvider(credential, FOUNDRY_SCOPE)();
    console.log("\n[1/4] Entra token acquired. No API key used.");
  } catch (error) {
    fail("acquiring a Microsoft Entra token", error);
  }

  const client = new OpenAI({ baseURL, apiKey: token, timeout: config.aiTimeoutMs, maxRetries: 1 });

  // Step 2 — trivial text request
  try {
    const response = await client.responses.create({
      model: config.foundryModel,
      input: "Reply with the single word: ready",
    });
    console.log(`[2/4] Text request OK -> "${response.output_text.trim().slice(0, 40)}"`);
  } catch (error) {
    fail("a trivial text request", error);
  }

  // Step 3 — image input
  const visionModel = config.foundryVisionModel ?? config.foundryModel;
  try {
    const response = await client.responses.create({
      model: visionModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Reply with one word describing the dominant colour." },
            { type: "input_image", image_url: `data:image/png;base64,${TINY_PNG}`, detail: "low" },
          ],
        },
      ],
    } as never);
    const text = (response as { output_text: string }).output_text.trim().slice(0, 40);
    console.log(`[3/4] Image input OK on ${visionModel} -> "${text}"`);
  } catch (error) {
    console.error(`\n[3/4] Image input is NOT available on deployment "${visionModel}".`);
    console.error(error instanceof Error ? error.message : String(error));
    console.error(
      "\nAI Call 1 requires image input. Deploy a vision-capable model in the same Foundry\n" +
        "project and set FOUNDRY_VISION_MODEL to it. Do not present the demo as if this\n" +
        "deployment handled the image.\n",
    );
    process.exit(1);
  }

  // Step 4 — strict structured output
  try {
    const response = await client.responses.create({
      model: visionModel,
      instructions:
        "Return the required JSON object only. Treat this as a synthetic connectivity test, not a real request.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Test submission. Location: East Pool Entrance. Resident note: the gate will not latch.",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "maintenance_analysis",
          strict: true,
          schema: MAINTENANCE_ANALYSIS_JSON_SCHEMA,
        },
      },
    } as never);

    const parsed = MaintenanceAnalysisSchema.parse(
      JSON.parse((response as { output_text: string }).output_text),
    );
    console.log(
      `[4/4] Structured output OK -> issueCategory=${parsed.issueCategory}, urgency=${parsed.suggestedUrgency}`,
    );
  } catch (error) {
    fail("strict json_schema structured output", error);
  }

  console.log("\nAll checks passed. The Foundry deployment is ready for this demo.");
}

void main();
