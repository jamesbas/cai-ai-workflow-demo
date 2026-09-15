import { randomUUID } from "node:crypto";
import { insertAuditEvent, listAuditEvents, nextAuditSeq } from "@/lib/db/repositories";
import type { ActorType, AuditEventRow } from "@/lib/types";
import type { AuditAction } from "@/lib/workflow/states";

export interface AuditInput {
  caseId: string;
  actorType: ActorType;
  actorName: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  reason?: string;
  correlationId?: string;
}

function serialize(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export function recordAudit(input: AuditInput): AuditEventRow {
  const row: AuditEventRow = {
    id: `EVT-${randomUUID()}`,
    case_id: input.caseId,
    event_time: new Date().toISOString(),
    seq: nextAuditSeq(input.caseId),
    actor_type: input.actorType,
    actor_name: input.actorName,
    action: input.action,
    before_json: serialize(input.before),
    after_json: serialize(input.after),
    reason: input.reason ?? null,
    correlation_id: input.correlationId ?? null,
  };
  insertAuditEvent(row);
  return row;
}

export interface AuditView {
  id: string;
  caseId: string;
  timestampUtc: string;
  seq: number;
  actorType: ActorType;
  actorName: string;
  action: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  correlationId: string | null;
}

function parse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getAuditTrail(caseId: string): AuditView[] {
  return listAuditEvents(caseId).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    timestampUtc: row.event_time,
    seq: row.seq,
    actorType: row.actor_type as ActorType,
    actorName: row.actor_name,
    action: row.action,
    before: parse(row.before_json),
    after: parse(row.after_json),
    reason: row.reason,
    correlationId: row.correlation_id,
  }));
}

export interface WorkflowMetrics {
  elapsedSeconds: number;
  aiCalls: number;
  humanOverrides: number;
  finalState: string;
}

export function computeMetrics(events: AuditView[], aiCalls: number, finalState: string): WorkflowMetrics {
  const first = events[0];
  const last = events[events.length - 1];
  const elapsedMs =
    first && last ? Date.parse(last.timestampUtc) - Date.parse(first.timestampUtc) : 0;

  return {
    elapsedSeconds: Math.max(0, Math.round(elapsedMs / 1000)),
    aiCalls,
    humanOverrides: events.filter((event) => event.action === "HUMAN_OVERRIDE_APPLIED").length,
    finalState,
  };
}
