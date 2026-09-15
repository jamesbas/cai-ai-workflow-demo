import type { ActorType } from "@/lib/types";
import type { CaseState } from "@/lib/workflow/states";

const ALLOWED_TRANSITIONS: Record<CaseState, readonly CaseState[]> = {
  SUBMITTED: ["AI_ANALYZED"],
  AI_ANALYZED: ["CONTEXT_ENRICHED"],
  CONTEXT_ENRICHED: ["DRAFT_READY"],
  DRAFT_READY: ["AWAITING_HUMAN_REVIEW"],
  AWAITING_HUMAN_REVIEW: ["APPROVED", "REJECTED", "REROUTED"],
  APPROVED: ["SIMULATED_DISPATCH"],
  REJECTED: [],
  // A rerouted case returns to the review queue so it can still be decided.
  REROUTED: ["AWAITING_HUMAN_REVIEW"],
  SIMULATED_DISPATCH: [],
};

/**
 * Decision states may only be entered by an authenticated human reviewer.
 * This is the structural reason the model cannot approve or dispatch work.
 */
const REQUIRED_ACTOR: Partial<Record<CaseState, ActorType>> = {
  APPROVED: "HUMAN_REVIEWER",
  REJECTED: "HUMAN_REVIEWER",
  REROUTED: "HUMAN_REVIEWER",
  SIMULATED_DISPATCH: "SYSTEM",
};

export class WorkflowError extends Error {
  readonly status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "WorkflowError";
    this.status = status;
  }
}

export function canTransition(from: CaseState, to: CaseState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function actorMayEnter(state: CaseState, actorType: ActorType): boolean {
  const required = REQUIRED_ACTOR[state];
  return required === undefined || required === actorType;
}

export function assertTransition(from: CaseState, to: CaseState, actorType: ActorType): void {
  if (!canTransition(from, to)) {
    throw new WorkflowError(`Transition ${from} -> ${to} is not allowed.`);
  }
  if (!actorMayEnter(to, actorType)) {
    throw new WorkflowError(
      `Actor ${actorType} is not permitted to move a case to ${to}.`,
      403,
    );
  }
}

export function allowedNextStates(from: CaseState): readonly CaseState[] {
  return ALLOWED_TRANSITIONS[from];
}
