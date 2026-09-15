import { NextResponse } from "next/server";
import { listResidents } from "@/lib/db/repositories";
import { DEMO_SCENARIOS } from "@/lib/demo/scenarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    scenarios: DEMO_SCENARIOS,
    residents: listResidents().map((resident) => ({
      id: resident.id,
      displayName: resident.display_name,
      propertyAddress: resident.property_address,
    })),
  });
}
