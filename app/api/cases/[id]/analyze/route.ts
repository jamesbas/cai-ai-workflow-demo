import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/respond";
import { analyzeMaintenance } from "@/lib/ai/analyzeMaintenance";
import { draftWorkOrder } from "@/lib/ai/draftWorkOrder";
import { recordAudit } from "@/lib/audit/audit";
import { getCaseView, sanitizeText } from "@/lib/cases/view";
import { config } from "@/lib/config";
import {
  getCase,
  getCaseImage,
  getCommunity,
  getResident,
  updateCase,
} from "@/lib/db/repositories";
import { log } from "@/lib/log";
import { buildAssociationContext, normalizeCategory } from "@/lib/workflow/routing";
import { isCaseState, type CaseState } from "@/lib/workflow/states";
import { assertTransition, WorkflowError } from "@/lib/workflow/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AI_ACTOR = "Microsoft Foundry model";
const SYSTEM_ACTOR = "Association records service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const correlationId = randomUUID();

  const row = getCase(id);
  if (!row) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const current: CaseState = isCaseState(row.status) ? row.status : "SUBMITTED";
  if (current !== "SUBMITTED") {
    return NextResponse.json(
      { error: `Case is already in state ${current} and cannot be re-analyzed.` },
      { status: 409 },
    );
  }

  const resident = getResident(row.resident_id);
  const community = getCommunity(row.community_id);
  const image = getCaseImage(id);
  const modelLabel = `${AI_ACTOR} (${config.fixtureMode ? "fixture" : config.foundryVisionModel ?? config.foundryModel})`;

  recordAudit({
    caseId: id,
    actorType: "AI",
    actorName: modelLabel,
    action: "AI_ANALYSIS_STARTED",
    reason: "Interpreting the submitted photo and resident note.",
    correlationId,
  });

  try {
    // --- AI Call 1: interpret the submission -------------------------------
    const analysisResult = await analyzeMaintenance({
      residentName: resident?.display_name ?? "Unknown resident",
      submittedLocation: row.submitted_location,
      residentNote: row.resident_note,
      image: image ? { buffer: image.blob, mime: image.mime } : null,
      correlationId,
    });

    const analysis = {
      ...analysisResult.analysis,
      observations: analysisResult.analysis.observations.map(sanitizeText),
      residentReportedFacts: analysisResult.analysis.residentReportedFacts.map(sanitizeText),
      urgencyReason: sanitizeText(analysisResult.analysis.urgencyReason),
      missingInformation: analysisResult.analysis.missingInformation.map(sanitizeText),
    };

    const issueCategory = normalizeCategory(analysis.issueCategory);

    assertTransition("SUBMITTED", "AI_ANALYZED", "AI");
    updateCase(id, {
      status: "AI_ANALYZED",
      ai_analysis_json: JSON.stringify(analysis),
      issue_category: issueCategory,
      recommended_priority: analysis.suggestedUrgency,
      ai_call_count: row.ai_call_count + 1,
      fixture_mode: analysisResult.fixture ? 1 : 0,
    });

    recordAudit({
      caseId: id,
      actorType: "AI",
      actorName: modelLabel,
      action: "AI_ANALYSIS_COMPLETED",
      after: {
        issueCategory,
        suggestedUrgency: analysis.suggestedUrgency,
        confidence: analysis.confidence,
        observationCount: analysis.observations.length,
      },
      reason: analysis.urgencyReason,
      correlationId,
    });

    // --- Deterministic association lookup ---------------------------------
    const associationContext = buildAssociationContext({
      issueCategory,
      assetType: analysis.assetType,
      locationHint: analysis.locationHint,
      submittedLocation: row.submitted_location,
    });

    recordAudit({
      caseId: id,
      actorType: "SYSTEM",
      actorName: SYSTEM_ACTOR,
      action: "ASSET_MATCHED",
      after: associationContext.asset
        ? { assetId: associationContext.asset.id, name: associationContext.asset.name }
        : { assetId: null },
      reason: `Matched by ${associationContext.matchMethod}.`,
      correlationId,
    });

    recordAudit({
      caseId: id,
      actorType: "SYSTEM",
      actorName: SYSTEM_ACTOR,
      action: "WARRANTY_RETRIEVED",
      after: associationContext.warranty,
      reason: associationContext.warranty.active
        ? "Active warranty found on the matched asset."
        : "No active warranty on file for the matched asset.",
      correlationId,
    });

    recordAudit({
      caseId: id,
      actorType: "SYSTEM",
      actorName: SYSTEM_ACTOR,
      action: "MAINTENANCE_HISTORY_RETRIEVED",
      after: {
        records: associationContext.maintenanceHistory
          .map((record) => `${record.id} ${record.work_date} — ${record.summary}`)
          .join(" | "),
      },
      reason: `Retrieved ${associationContext.maintenanceHistory.length} recent record(s).`,
      correlationId,
    });

    recordAudit({
      caseId: id,
      actorType: "SYSTEM",
      actorName: SYSTEM_ACTOR,
      action: "SLA_APPLIED",
      after: associationContext.sla
        ? {
            slaId: associationContext.sla.id,
            defaultPriority: associationContext.sla.default_priority,
            ackMinutes: associationContext.sla.ack_minutes,
            targetResolutionHours: associationContext.sla.target_resolution_hours,
          }
        : { slaId: null },
      reason: associationContext.sla?.description ?? "No SLA matched for this category.",
      correlationId,
    });

    recordAudit({
      caseId: id,
      actorType: "SYSTEM",
      actorName: SYSTEM_ACTOR,
      action: "VENDOR_ROUTED",
      after: {
        vendorId: associationContext.recommendedVendorId,
        vendorName: associationContext.recommendedVendorName,
      },
      reason: associationContext.routingReason,
      correlationId,
    });

    assertTransition("AI_ANALYZED", "CONTEXT_ENRICHED", "SYSTEM");
    updateCase(id, {
      status: "CONTEXT_ENRICHED",
      asset_id: associationContext.asset?.id ?? null,
      context_json: JSON.stringify(associationContext),
      recommended_vendor_id: associationContext.recommendedVendorId,
    });

    // --- AI Call 2: draft operational language -----------------------------
    const draftResult = await draftWorkOrder({
      analysis,
      context: associationContext,
      communityName: community?.name ?? "Demo Community Association",
      residentName: resident?.display_name ?? "Unknown resident",
      submittedLocation: row.submitted_location,
      residentNote: row.resident_note,
      correlationId,
    });

    const draft = {
      workOrderTitle: sanitizeText(draftResult.draft.workOrderTitle),
      workOrderDescription: sanitizeText(draftResult.draft.workOrderDescription),
      residentAcknowledgement: sanitizeText(draftResult.draft.residentAcknowledgement),
      managerSummary: sanitizeText(draftResult.draft.managerSummary),
    };

    assertTransition("CONTEXT_ENRICHED", "DRAFT_READY", "AI");
    updateCase(id, {
      status: "DRAFT_READY",
      draft_json: JSON.stringify(draft),
      work_order_title: draft.workOrderTitle,
      work_order_description: draft.workOrderDescription,
      ai_call_count: row.ai_call_count + 2,
    });

    recordAudit({
      caseId: id,
      actorType: "AI",
      actorName: modelLabel,
      action: "DRAFT_GENERATED",
      after: { workOrderTitle: draft.workOrderTitle },
      reason: "Draft work order and resident acknowledgement prepared for human review.",
      correlationId,
    });

    assertTransition("DRAFT_READY", "AWAITING_HUMAN_REVIEW", "SYSTEM");
    updateCase(id, { status: "AWAITING_HUMAN_REVIEW" });

    log("info", "case_analyzed", {
      caseId: id,
      correlationId,
      issueCategory,
      assetId: associationContext.asset?.id ?? null,
      call1Ms: analysisResult.elapsedMs,
      call2Ms: draftResult.elapsedMs,
      fixture: analysisResult.fixture,
    });

    return NextResponse.json(getCaseView(id));
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof AiError ? error.message : "The AI service did not respond in time.";

    recordAudit({
      caseId: id,
      actorType: "SYSTEM",
      actorName: SYSTEM_ACTOR,
      action: "AI_ANALYSIS_FAILED",
      reason: message,
      correlationId,
    });

    log("error", "case_analysis_failed", { caseId: id, correlationId, message });

    return NextResponse.json(
      { error: message, recoverable: true, correlationId },
      { status: 502 },
    );
  }
}
