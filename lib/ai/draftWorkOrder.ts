import { config } from "@/lib/config";
import { inferScenario, loadFixture } from "@/lib/ai/fixtures";
import { buildDraftUserText, DRAFT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { callStructured, type ContentPart } from "@/lib/ai/respond";
import {
  WORK_ORDER_DRAFT_JSON_SCHEMA,
  WorkOrderDraftSchema,
  type MaintenanceAnalysis,
  type WorkOrderDraft,
} from "@/lib/ai/schemas";
import type { AssociationContext } from "@/lib/types";

export interface DraftInput {
  analysis: MaintenanceAnalysis;
  context: AssociationContext;
  communityName: string;
  residentName: string;
  submittedLocation: string;
  residentNote: string;
  correlationId: string;
}

export interface DraftResult {
  draft: WorkOrderDraft;
  model: string;
  elapsedMs: number;
  fixture: boolean;
  promptText: string;
}

export async function draftWorkOrder(input: DraftInput): Promise<DraftResult> {
  const promptText = buildDraftUserText(input);

  if (config.fixtureMode) {
    const scenario = inferScenario(`${input.residentNote} ${input.submittedLocation}`);
    return {
      draft: loadFixture(scenario).draft,
      model: "fixture",
      elapsedMs: 0,
      fixture: true,
      promptText,
    };
  }

  const content: ContentPart[] = [{ type: "input_text", text: promptText }];

  const result = await callStructured({
    label: "AI Call 2 (work-order drafting)",
    model: config.foundryModel,
    instructions: DRAFT_SYSTEM_PROMPT,
    content,
    schemaName: "work_order_draft",
    jsonSchema: WORK_ORDER_DRAFT_JSON_SCHEMA as unknown as Record<string, unknown>,
    validator: WorkOrderDraftSchema,
    correlationId: input.correlationId,
  });

  return {
    draft: result.value,
    model: result.model,
    elapsedMs: result.elapsedMs,
    fixture: false,
    promptText,
  };
}
