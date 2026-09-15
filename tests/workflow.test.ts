import { describe, expect, it } from "vitest";
import {
  actorMayEnter,
  allowedNextStates,
  assertTransition,
  canTransition,
  WorkflowError,
} from "@/lib/workflow/transitions";

describe("workflow state machine", () => {
  it("walks the intended happy path", () => {
    expect(canTransition("SUBMITTED", "AI_ANALYZED")).toBe(true);
    expect(canTransition("AI_ANALYZED", "CONTEXT_ENRICHED")).toBe(true);
    expect(canTransition("CONTEXT_ENRICHED", "DRAFT_READY")).toBe(true);
    expect(canTransition("DRAFT_READY", "AWAITING_HUMAN_REVIEW")).toBe(true);
    expect(canTransition("AWAITING_HUMAN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "SIMULATED_DISPATCH")).toBe(true);
  });

  it("has no path from an AI stage straight to APPROVED", () => {
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(false);
    expect(canTransition("AI_ANALYZED", "APPROVED")).toBe(false);
    expect(canTransition("CONTEXT_ENRICHED", "APPROVED")).toBe(false);
    expect(canTransition("DRAFT_READY", "APPROVED")).toBe(false);
  });

  it("refuses to let the AI actor approve, reject, or reroute", () => {
    expect(actorMayEnter("APPROVED", "AI")).toBe(false);
    expect(actorMayEnter("REJECTED", "AI")).toBe(false);
    expect(actorMayEnter("REROUTED", "AI")).toBe(false);
    expect(actorMayEnter("APPROVED", "SYSTEM")).toBe(false);
    expect(actorMayEnter("APPROVED", "RESIDENT")).toBe(false);
    expect(actorMayEnter("APPROVED", "HUMAN_REVIEWER")).toBe(true);
  });

  it("throws a 403 when a non-human tries to approve", () => {
    expect(() => assertTransition("AWAITING_HUMAN_REVIEW", "APPROVED", "AI")).toThrowError(
      WorkflowError,
    );
    try {
      assertTransition("AWAITING_HUMAN_REVIEW", "APPROVED", "AI");
    } catch (error) {
      expect((error as WorkflowError).status).toBe(403);
    }
  });

  it("throws a 409 for an out-of-order transition", () => {
    try {
      assertTransition("SUBMITTED", "AWAITING_HUMAN_REVIEW", "SYSTEM");
      throw new Error("expected a WorkflowError");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError);
      expect((error as WorkflowError).status).toBe(409);
    }
  });

  it("does not allow simulated dispatch before approval", () => {
    expect(canTransition("AWAITING_HUMAN_REVIEW", "SIMULATED_DISPATCH")).toBe(false);
    expect(canTransition("DRAFT_READY", "SIMULATED_DISPATCH")).toBe(false);
    expect(actorMayEnter("SIMULATED_DISPATCH", "SYSTEM")).toBe(true);
    expect(actorMayEnter("SIMULATED_DISPATCH", "AI")).toBe(false);
  });

  it("treats rejection and dispatch as terminal", () => {
    expect(allowedNextStates("REJECTED")).toHaveLength(0);
    expect(allowedNextStates("SIMULATED_DISPATCH")).toHaveLength(0);
  });
});
