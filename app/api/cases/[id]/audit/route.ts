import { NextResponse } from "next/server";
import { computeMetrics, getAuditTrail } from "@/lib/audit/audit";
import { getCase } from "@/lib/db/repositories";
import { STATE_LABELS, isCaseState } from "@/lib/workflow/states";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const row = getCase(id);
  if (!row) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const events = getAuditTrail(id);
  const status = isCaseState(row.status) ? row.status : "SUBMITTED";

  return NextResponse.json({
    caseId: id,
    events,
    metrics: computeMetrics(events, row.ai_call_count, STATE_LABELS[status]),
  });
}
