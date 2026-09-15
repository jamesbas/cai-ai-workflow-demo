import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit/audit";
import { getReviewer } from "@/lib/auth/reviewer";
import { getCaseView, sanitizeText } from "@/lib/cases/view";
import { config } from "@/lib/config";
import { getCase, getVendor, updateCase } from "@/lib/db/repositories";
import { log } from "@/lib/log";
import { isCaseState, type CaseState } from "@/lib/workflow/states";
import { assertTransition, WorkflowError } from "@/lib/workflow/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ReviewRequestSchema = z.object({
  action: z.enum(["START_REVIEW", "APPROVE", "REJECT", "REROUTE"]),
  finalPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  finalVendorId: z.string().max(40).optional(),
  workOrderTitle: z.string().max(140).optional(),
  workOrderDescription: z.string().max(4000).optional(),
  reviewNote: z.string().max(2000).optional(),
});

interface FieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const correlationId = randomUUID();

  const parsed = ReviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  const body = parsed.data;

  const reviewer = getReviewer(request.headers);
  if (!reviewer.name) {
    return NextResponse.json({ error: "Reviewer identity is required." }, { status: 401 });
  }

  const row = getCase(id);
  if (!row) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const current: CaseState = isCaseState(row.status) ? row.status : "SUBMITTED";

  if (body.action === "START_REVIEW") {
    if (current !== "AWAITING_HUMAN_REVIEW") {
      return NextResponse.json({ error: "Case is not awaiting human review." }, { status: 409 });
    }
    if (!row.reviewer_name) {
      updateCase(id, { reviewer_name: reviewer.name });
      recordAudit({
        caseId: id,
        actorType: "HUMAN_REVIEWER",
        actorName: reviewer.name,
        action: "HUMAN_REVIEW_STARTED",
        reason: reviewer.authenticated
          ? "Authenticated reviewer opened the case for review."
          : "Demo reviewer opened the case for review.",
        correlationId,
      });
    }
    return NextResponse.json(getCaseView(id));
  }

  if (current !== "AWAITING_HUMAN_REVIEW") {
    return NextResponse.json(
      { error: `Review actions require state AWAITING_HUMAN_REVIEW. Current state is ${current}.` },
      { status: 409 },
    );
  }

  const reviewNote = body.reviewNote ? sanitizeText(body.reviewNote) : "";

  let vendorId = row.recommended_vendor_id;
  if (body.finalVendorId) {
    const vendor = getVendor(body.finalVendorId);
    if (!vendor || vendor.approved !== 1) {
      return NextResponse.json({ error: "Vendor is not an approved vendor." }, { status: 400 });
    }
    vendorId = vendor.id;
  }

  const priority = body.finalPriority ?? row.recommended_priority;
  const title = body.workOrderTitle ? sanitizeText(body.workOrderTitle) : row.work_order_title;
  const description = body.workOrderDescription
    ? sanitizeText(body.workOrderDescription)
    : row.work_order_description;

  const changes: FieldChange[] = [];
  if (priority !== row.recommended_priority) {
    changes.push({ field: "priority", before: row.recommended_priority, after: priority ?? null });
  }
  if (vendorId !== row.recommended_vendor_id) {
    changes.push({ field: "vendor", before: row.recommended_vendor_id, after: vendorId });
  }
  if (title !== row.work_order_title) {
    changes.push({ field: "workOrderTitle", before: row.work_order_title, after: title });
  }
  if (description !== row.work_order_description) {
    changes.push({
      field: "workOrderDescription",
      before: row.work_order_description,
      after: description,
    });
  }

  if (changes.length > 0 && !reviewNote) {
    return NextResponse.json(
      { error: "A reviewer note is required when the recommendation is changed." },
      { status: 400 },
    );
  }
  if (body.action !== "APPROVE" && !reviewNote) {
    return NextResponse.json(
      { error: "A reviewer note is required to reject or reroute." },
      { status: 400 },
    );
  }

  try {
    for (const change of changes) {
      recordAudit({
        caseId: id,
        actorType: "HUMAN_REVIEWER",
        actorName: reviewer.name,
        action: "HUMAN_OVERRIDE_APPLIED",
        before: { [change.field]: change.before },
        after: { [change.field]: change.after },
        reason: reviewNote,
        correlationId,
      });
    }

    updateCase(id, {
      final_priority: priority ?? null,
      final_vendor_id: vendorId,
      work_order_title: title,
      work_order_description: description,
      reviewer_name: reviewer.name,
      review_note: reviewNote || null,
      override_count: row.override_count + changes.length,
    });

    if (body.action === "APPROVE") {
      assertTransition(current, "APPROVED", "HUMAN_REVIEWER");
      updateCase(id, { status: "APPROVED", approved_at: new Date().toISOString() });
      recordAudit({
        caseId: id,
        actorType: "HUMAN_REVIEWER",
        actorName: reviewer.name,
        action: "HUMAN_APPROVED",
        after: { priority, vendorId, state: "APPROVED" },
        reason: reviewNote || "Reviewer approved the draft work order.",
        correlationId,
      });

      if (!config.externalDispatchEnabled) {
        assertTransition("APPROVED", "SIMULATED_DISPATCH", "SYSTEM");
        updateCase(id, { status: "SIMULATED_DISPATCH" });
        recordAudit({
          caseId: id,
          actorType: "SYSTEM",
          actorName: "Demo Mode guard",
          action: "EXTERNAL_DISPATCH_SUPPRESSED",
          after: { externalDispatch: false },
          reason:
            "Demo Mode is enabled. No vendor, email, SMS, or resident system was contacted.",
          correlationId,
        });
      }
    } else if (body.action === "REJECT") {
      assertTransition(current, "REJECTED", "HUMAN_REVIEWER");
      updateCase(id, { status: "REJECTED" });
      recordAudit({
        caseId: id,
        actorType: "HUMAN_REVIEWER",
        actorName: reviewer.name,
        action: "HUMAN_REJECTED",
        after: { state: "REJECTED" },
        reason: reviewNote,
        correlationId,
      });
    } else {
      assertTransition(current, "REROUTED", "HUMAN_REVIEWER");
      updateCase(id, { status: "REROUTED" });
      recordAudit({
        caseId: id,
        actorType: "HUMAN_REVIEWER",
        actorName: reviewer.name,
        action: "HUMAN_REROUTED",
        after: { state: "REROUTED", vendorId },
        reason: reviewNote,
        correlationId,
      });
      // Rerouted work still needs a decision, so it returns to the review queue.
      assertTransition("REROUTED", "AWAITING_HUMAN_REVIEW", "SYSTEM");
      updateCase(id, { status: "AWAITING_HUMAN_REVIEW" });
    }
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  log("info", "case_reviewed", {
    caseId: id,
    correlationId,
    action: body.action,
    overrides: changes.length,
    authenticated: reviewer.authenticated,
  });

  return NextResponse.json(getCaseView(id));
}
