import { NextResponse } from "next/server";
import { getCaseView } from "@/lib/cases/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const view = getCaseView(id);
  if (!view) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  return NextResponse.json(view);
}
