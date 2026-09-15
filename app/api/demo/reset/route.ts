import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getReviewer } from "@/lib/auth/reviewer";
import { deleteGeneratedCases } from "@/lib/db/repositories";
import { ALLOWED_SAMPLE_IMAGES, PRIMARY_SCENARIO } from "@/lib/demo/scenarios";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const reviewer = getReviewer(request.headers);
  const removed = deleteGeneratedCases();

  const imagesDir = path.join(process.cwd(), "public", "demo-images");
  const missingImages = ALLOWED_SAMPLE_IMAGES.filter(
    (file) => !fs.existsSync(path.join(imagesDir, file)),
  );
  const primaryImageReady = !missingImages.includes(PRIMARY_SCENARIO.imageFile);

  log("info", "demo_reset", {
    reviewer: reviewer.name,
    casesRemoved: removed.cases,
    auditEventsRemoved: removed.auditEvents,
    missingImages: missingImages.length,
  });

  return NextResponse.json({
    reset: true,
    casesRemoved: removed.cases,
    auditEventsRemoved: removed.auditEvents,
    primaryImageReady,
    missingImages,
  });
}
