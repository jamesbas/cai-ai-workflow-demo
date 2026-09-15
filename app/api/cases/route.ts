import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { recordAudit } from "@/lib/audit/audit";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/config";
import { getCaseSummaries, sanitizeText } from "@/lib/cases/view";
import { getResident, insertCase } from "@/lib/db/repositories";
import { ALLOWED_SAMPLE_IMAGES, getScenario } from "@/lib/demo/scenarios";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function readSampleImage(fileName: string): { buffer: Buffer; mime: string } | null {
  if (!ALLOWED_SAMPLE_IMAGES.includes(fileName)) return null;
  const filePath = path.join(process.cwd(), "public", "demo-images", path.basename(fileName));
  if (!fs.existsSync(filePath)) return null;
  const mime = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()];
  if (!mime) return null;
  return { buffer: fs.readFileSync(filePath), mime };
}

export async function GET() {
  return NextResponse.json({ cases: getCaseSummaries() });
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  const form = await request.formData();

  const residentId = sanitizeText(String(form.get("residentId") ?? ""));
  const submittedLocation = sanitizeText(String(form.get("submittedLocation") ?? "")).slice(0, 200);
  const residentNote = sanitizeText(String(form.get("residentNote") ?? "")).slice(0, 2000);
  const scenarioId = sanitizeText(String(form.get("scenarioId") ?? "")) || null;
  const sampleImage = sanitizeText(String(form.get("sampleImage") ?? ""));

  if (!residentId || !submittedLocation || !residentNote) {
    return NextResponse.json(
      { error: "residentId, submittedLocation, and residentNote are required." },
      { status: 400 },
    );
  }

  const resident = getResident(residentId);
  if (!resident) {
    return NextResponse.json({ error: "Unknown resident." }, { status: 400 });
  }

  if (scenarioId && !getScenario(scenarioId)) {
    return NextResponse.json({ error: "Unknown scenario." }, { status: 400 });
  }

  let image: { buffer: Buffer; mime: string; name: string } | null = null;

  const upload = form.get("image");
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image exceeds the 8 MB limit." }, { status: 413 });
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(upload.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WEBP images are accepted." },
        { status: 415 },
      );
    }
    image = {
      buffer: Buffer.from(await upload.arrayBuffer()),
      mime: upload.type,
      name: path.basename(upload.name).slice(0, 120),
    };
  } else if (sampleImage) {
    const sample = readSampleImage(sampleImage);
    if (!sample) {
      return NextResponse.json({ error: "Sample image is not available." }, { status: 400 });
    }
    image = { ...sample, name: sampleImage };
  }

  if (!image) {
    return NextResponse.json({ error: "A photo is required." }, { status: 400 });
  }

  const id = `CASE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

  insertCase({
    id,
    communityId: resident.community_id,
    residentId: resident.id,
    scenarioId,
    submittedLocation,
    residentNote,
    imageName: image.name,
    imageMime: image.mime,
    imageBlob: image.buffer,
    status: "SUBMITTED",
    createdAt: new Date().toISOString(),
  });

  recordAudit({
    caseId: id,
    actorType: "RESIDENT",
    actorName: resident.display_name,
    action: "REQUEST_SUBMITTED",
    after: { submittedLocation, residentNote, imageName: image.name },
    reason: "Resident submitted a maintenance request with a photo.",
    correlationId,
  });

  log("info", "case_created", { caseId: id, correlationId, scenarioId });

  return NextResponse.json({ id, status: "SUBMITTED", correlationId }, { status: 201 });
}
