import type { ZodType } from "zod";
import { getAiClient } from "@/lib/ai/client";
import { log } from "@/lib/log";

export class AiError extends Error {
  readonly recoverable = true;

  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

export interface ContentPart {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: string;
  detail?: "auto" | "low" | "high";
}

export interface StructuredCallOptions<T> {
  label: string;
  model: string;
  instructions: string;
  content: ContentPart[];
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  validator: ZodType<T>;
  correlationId: string;
}

export interface StructuredCallResult<T> {
  value: T;
  model: string;
  elapsedMs: number;
}

export async function callStructured<T>(
  options: StructuredCallOptions<T>,
): Promise<StructuredCallResult<T>> {
  const client = await getAiClient();
  const startedAt = Date.now();

  log("info", "ai_call_started", {
    label: options.label,
    model: options.model,
    correlationId: options.correlationId,
  });

  let rawText: string;
  try {
    const response = await client.responses.create({
      model: options.model,
      instructions: options.instructions,
      input: [{ role: "user", content: options.content }],
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.jsonSchema,
        },
      },
    } as never);
    rawText = (response as { output_text?: string }).output_text ?? "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    log("error", "ai_call_failed", {
      label: options.label,
      model: options.model,
      correlationId: options.correlationId,
      message,
    });
    throw new AiError(`${options.label} failed: ${message}`);
  }

  const elapsedMs = Date.now() - startedAt;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new AiError(`${options.label} returned output that was not valid JSON.`);
  }

  const result = options.validator.safeParse(parsed);
  if (!result.success) {
    log("error", "ai_schema_validation_failed", {
      label: options.label,
      correlationId: options.correlationId,
      issues: result.error.issues.map((issue) => issue.path.join(".")).join(","),
    });
    throw new AiError(`${options.label} returned output that did not match the required schema.`);
  }

  log("info", "ai_call_completed", {
    label: options.label,
    model: options.model,
    correlationId: options.correlationId,
    elapsedMs,
  });

  return { value: result.data, model: options.model, elapsedMs };
}
