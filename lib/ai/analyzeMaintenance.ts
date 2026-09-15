import { config } from "@/lib/config";
import { inferScenario, loadFixture } from "@/lib/ai/fixtures";
import { buildAnalysisUserText, ANALYSIS_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { callStructured, type ContentPart } from "@/lib/ai/respond";
import {
  MAINTENANCE_ANALYSIS_JSON_SCHEMA,
  MaintenanceAnalysisSchema,
  type MaintenanceAnalysis,
} from "@/lib/ai/schemas";
import { ISSUE_CATEGORIES } from "@/lib/workflow/routing";

export interface AnalyzeInput {
  residentName: string;
  submittedLocation: string;
  residentNote: string;
  image: { buffer: Buffer; mime: string } | null;
  correlationId: string;
}

export interface AnalyzeResult {
  analysis: MaintenanceAnalysis;
  model: string;
  elapsedMs: number;
  fixture: boolean;
}

export async function analyzeMaintenance(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (config.fixtureMode) {
    const scenario = inferScenario(`${input.residentNote} ${input.submittedLocation}`);
    return {
      analysis: loadFixture(scenario).analysis,
      model: "fixture",
      elapsedMs: 0,
      fixture: true,
    };
  }

  const content: ContentPart[] = [
    {
      type: "input_text",
      text: buildAnalysisUserText({
        residentName: input.residentName,
        submittedLocation: input.submittedLocation,
        residentNote: input.residentNote,
        permittedCategories: [...ISSUE_CATEGORIES, "UNKNOWN"],
      }),
    },
  ];

  if (input.image) {
    content.push({
      type: "input_image",
      image_url: `data:${input.image.mime};base64,${input.image.buffer.toString("base64")}`,
      detail: "auto",
    });
  }

  const model = config.foundryVisionModel ?? config.foundryModel;
  const result = await callStructured({
    label: "AI Call 1 (maintenance analysis)",
    model,
    instructions: ANALYSIS_SYSTEM_PROMPT,
    content,
    schemaName: "maintenance_analysis",
    jsonSchema: MAINTENANCE_ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
    validator: MaintenanceAnalysisSchema,
    correlationId: input.correlationId,
  });

  return {
    // Human review is a workflow guarantee, not a model choice.
    analysis: { ...result.value, requiresHumanReview: true },
    model: result.model,
    elapsedMs: result.elapsedMs,
    fixture: false,
  };
}
