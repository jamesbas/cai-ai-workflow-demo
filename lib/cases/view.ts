import { computeMetrics, getAuditTrail, type AuditView, type WorkflowMetrics } from "@/lib/audit/audit";
import type { MaintenanceAnalysis, WorkOrderDraft } from "@/lib/ai/schemas";
import { config } from "@/lib/config";
import {
  getCase,
  getCommunity,
  getResident,
  listApprovedVendors,
  listCases,
} from "@/lib/db/repositories";
import type { AssociationContext, Vendor } from "@/lib/types";
import { STATE_LABELS, isCaseState, type CaseState } from "@/lib/workflow/states";

/** Strips control characters from model- or user-supplied text before it is stored or rendered. */
export function sanitizeText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export interface CaseView {
  id: string;
  status: CaseState;
  statusLabel: string;
  scenarioId: string | null;
  community: { id: string; name: string } | null;
  resident: { id: string; displayName: string; propertyAddress: string } | null;
  submittedLocation: string;
  residentNote: string;
  imageName: string | null;
  imageUrl: string | null;
  analysis: MaintenanceAnalysis | null;
  context: AssociationContext | null;
  draft: WorkOrderDraft | null;
  workOrderTitle: string | null;
  workOrderDescription: string | null;
  recommendedPriority: string | null;
  finalPriority: string | null;
  recommendedVendorId: string | null;
  finalVendorId: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  approvedVendors: Vendor[];
  audit: AuditView[];
  metrics: WorkflowMetrics;
  aiCalls: number;
  fixtureMode: boolean;
  demoMode: boolean;
  externalDispatchEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

export function getCaseView(id: string): CaseView | null {
  const row = getCase(id);
  if (!row) return null;

  const audit = getAuditTrail(id);
  const status: CaseState = isCaseState(row.status) ? row.status : "SUBMITTED";
  const community = getCommunity(row.community_id);
  const resident = getResident(row.resident_id);

  return {
    id: row.id,
    status,
    statusLabel: STATE_LABELS[status],
    scenarioId: row.scenario_id,
    community: community ? { id: community.id, name: community.name } : null,
    resident: resident
      ? {
          id: resident.id,
          displayName: resident.display_name,
          propertyAddress: resident.property_address,
        }
      : null,
    submittedLocation: row.submitted_location,
    residentNote: row.resident_note,
    imageName: row.image_name,
    imageUrl: row.image_name ? `/api/cases/${row.id}/image` : null,
    analysis: parseJson<MaintenanceAnalysis>(row.ai_analysis_json),
    context: parseJson<AssociationContext>(row.context_json),
    draft: parseJson<WorkOrderDraft>(row.draft_json),
    workOrderTitle: row.work_order_title,
    workOrderDescription: row.work_order_description,
    recommendedPriority: row.recommended_priority,
    finalPriority: row.final_priority,
    recommendedVendorId: row.recommended_vendor_id,
    finalVendorId: row.final_vendor_id,
    reviewerName: row.reviewer_name,
    reviewNote: row.review_note,
    approvedVendors: listApprovedVendors(),
    audit,
    metrics: computeMetrics(audit, row.ai_call_count, STATE_LABELS[status]),
    aiCalls: row.ai_call_count,
    fixtureMode: row.fixture_mode === 1,
    demoMode: config.demoMode,
    externalDispatchEnabled: config.externalDispatchEnabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
  };
}

export interface CaseSummary {
  id: string;
  status: CaseState;
  statusLabel: string;
  submittedLocation: string;
  issueCategory: string | null;
  finalPriority: string | null;
  recommendedPriority: string | null;
  createdAt: string;
}

export function getCaseSummaries(): CaseSummary[] {
  return listCases().map((row) => {
    const status: CaseState = isCaseState(row.status) ? row.status : "SUBMITTED";
    return {
      id: row.id,
      status,
      statusLabel: STATE_LABELS[status],
      submittedLocation: row.submitted_location,
      issueCategory: row.issue_category,
      finalPriority: row.final_priority,
      recommendedPriority: row.recommended_priority,
      createdAt: row.created_at,
    };
  });
}
