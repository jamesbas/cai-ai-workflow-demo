export const CASE_STATES = [
  "SUBMITTED",
  "AI_ANALYZED",
  "CONTEXT_ENRICHED",
  "DRAFT_READY",
  "AWAITING_HUMAN_REVIEW",
  "APPROVED",
  "REJECTED",
  "REROUTED",
  "SIMULATED_DISPATCH",
] as const;

export type CaseState = (typeof CASE_STATES)[number];

export function isCaseState(value: string): value is CaseState {
  return (CASE_STATES as readonly string[]).includes(value);
}

export const STATE_LABELS: Record<CaseState, string> = {
  SUBMITTED: "Submitted",
  AI_ANALYZED: "AI analyzed",
  CONTEXT_ENRICHED: "Context enriched",
  DRAFT_READY: "Draft ready",
  AWAITING_HUMAN_REVIEW: "Awaiting human review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REROUTED: "Rerouted",
  SIMULATED_DISPATCH: "Approved — dispatch simulated",
};

export const AUDIT_ACTIONS = [
  "REQUEST_SUBMITTED",
  "AI_ANALYSIS_STARTED",
  "AI_ANALYSIS_COMPLETED",
  "ASSET_MATCHED",
  "WARRANTY_RETRIEVED",
  "MAINTENANCE_HISTORY_RETRIEVED",
  "SLA_APPLIED",
  "VENDOR_ROUTED",
  "DRAFT_GENERATED",
  "HUMAN_REVIEW_STARTED",
  "HUMAN_OVERRIDE_APPLIED",
  "HUMAN_APPROVED",
  "HUMAN_REJECTED",
  "HUMAN_REROUTED",
  "EXTERNAL_DISPATCH_SUPPRESSED",
  "AI_ANALYSIS_FAILED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
