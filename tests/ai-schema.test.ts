import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCENARIOS, loadFixture, inferScenario } from "@/lib/ai/fixtures";
import {
  MAINTENANCE_ANALYSIS_JSON_SCHEMA,
  MaintenanceAnalysisSchema,
  WORK_ORDER_DRAFT_JSON_SCHEMA,
  WorkOrderDraftSchema,
} from "@/lib/ai/schemas";

describe("AI output schemas", () => {
  it("accepts the documented Call 1 shape", () => {
    const result = MaintenanceAnalysisSchema.safeParse({
      issueCategory: "POOL_GATE",
      assetType: "pool_gate",
      locationHint: "East Pool Entrance",
      observations: ["A gate is visible in an open position."],
      residentReportedFacts: ["The gate does not latch."],
      suggestedUrgency: "HIGH",
      urgencyReason: "A malfunctioning controlled-access pool gate may create a safety concern.",
      confidence: "HIGH",
      missingInformation: [],
      requiresHumanReview: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects URGENT from the model", () => {
    const result = MaintenanceAnalysisSchema.safeParse({
      issueCategory: "POOL_GATE",
      assetType: "pool_gate",
      locationHint: "East Pool Entrance",
      observations: [],
      residentReportedFacts: [],
      suggestedUrgency: "URGENT",
      urgencyReason: "x",
      confidence: "HIGH",
      missingInformation: [],
      requiresHumanReview: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects numeric confidence and unknown categories", () => {
    const base = {
      issueCategory: "POOL_GATE",
      assetType: "pool_gate",
      locationHint: "East Pool Entrance",
      observations: [],
      residentReportedFacts: [],
      suggestedUrgency: "HIGH",
      urgencyReason: "x",
      missingInformation: [],
      requiresHumanReview: true,
    };
    expect(MaintenanceAnalysisSchema.safeParse({ ...base, confidence: 87 }).success).toBe(false);
    expect(
      MaintenanceAnalysisSchema.safeParse({
        ...base,
        confidence: "HIGH",
        issueCategory: "VIOLATION",
      }).success,
    ).toBe(false);
  });

  it("rejects an incomplete Call 2 draft", () => {
    expect(
      WorkOrderDraftSchema.safeParse({ workOrderTitle: "x", workOrderDescription: "y" }).success,
    ).toBe(false);
  });

  it("uses strict json_schema objects the Responses API will accept", () => {
    for (const schema of [MAINTENANCE_ANALYSIS_JSON_SCHEMA, WORK_ORDER_DRAFT_JSON_SCHEMA]) {
      expect(schema.additionalProperties).toBe(false);
      expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
    }
  });
});

describe("fixtures", () => {
  it("ships a fixture file for every scenario and every fixture validates", () => {
    for (const scenarioId of Object.keys(SCENARIOS) as Array<keyof typeof SCENARIOS>) {
      const file = path.join(process.cwd(), "fixtures", SCENARIOS[scenarioId]);
      expect(fs.existsSync(file)).toBe(true);
      const fixture = loadFixture(scenarioId);
      expect(fixture.analysis.requiresHumanReview).toBe(true);
      expect(fixture.draft.workOrderTitle.length).toBeGreaterThan(0);
    }
  });

  it("routes fixture selection from the resident text", () => {
    expect(inferScenario("The east pool gate won't latch")).toBe("SCENARIO-POOL-GATE");
    expect(inferScenario("Water running across the path near Lot 42")).toBe("SCENARIO-IRRIGATION");
    expect(inferScenario("The trail light has been out")).toBe("SCENARIO-TRAIL-LIGHT");
  });
});
