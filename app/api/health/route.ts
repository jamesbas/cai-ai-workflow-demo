import { NextResponse } from "next/server";
import { checkFoundryConnectivity } from "@/lib/ai/client";
import { config } from "@/lib/config";
import { databaseHealthy } from "@/lib/db/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = databaseHealthy();
  const foundry = await checkFoundryConnectivity();

  const body = {
    status: database && foundry.ok ? "ok" : "degraded",
    database: database ? "ok" : "error",
    foundry: foundry.ok ? "ok" : "error",
    foundryDetail: foundry.detail,
    demoMode: config.demoMode,
    externalDispatch: config.externalDispatchEnabled,
    fixtureMode: config.fixtureMode,
    model: config.foundryModel,
    visionModel: config.foundryVisionModel ?? config.foundryModel,
  };

  return NextResponse.json(body, { status: body.status === "ok" ? 200 : 503 });
}
