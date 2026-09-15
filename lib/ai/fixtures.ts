import fs from "node:fs";
import path from "node:path";
import {
  MaintenanceAnalysisSchema,
  WorkOrderDraftSchema,
  type MaintenanceAnalysis,
  type WorkOrderDraft,
} from "@/lib/ai/schemas";

export const SCENARIOS = {
  "SCENARIO-POOL-GATE": "ai-pool-gate.json",
  "SCENARIO-IRRIGATION": "ai-irrigation.json",
  "SCENARIO-TRAIL-LIGHT": "ai-trail-light.json",
} as const;

export type ScenarioId = keyof typeof SCENARIOS;

interface FixtureFile {
  scenarioId: ScenarioId;
  analysis: MaintenanceAnalysis;
  draft: WorkOrderDraft;
}

function fixturesDir(): string {
  return path.join(process.cwd(), "fixtures");
}

export function loadFixture(scenarioId: ScenarioId): FixtureFile {
  const file = path.join(fixturesDir(), SCENARIOS[scenarioId]);
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as FixtureFile;
  return {
    scenarioId,
    analysis: MaintenanceAnalysisSchema.parse(raw.analysis),
    draft: WorkOrderDraftSchema.parse(raw.draft),
  };
}

/** Picks the closest seeded scenario so fixture mode still tracks the input. */
export function inferScenario(text: string): ScenarioId {
  const value = text.toLowerCase();
  if (value.includes("irrigation") || value.includes("water") || value.includes("lot 42")) {
    return "SCENARIO-IRRIGATION";
  }
  if (value.includes("light") || value.includes("trail")) return "SCENARIO-TRAIL-LIGHT";
  return "SCENARIO-POOL-GATE";
}
