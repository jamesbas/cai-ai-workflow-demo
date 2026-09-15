import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as createCase } from "@/app/api/cases/route";
import { POST as analyzeCase } from "@/app/api/cases/[id]/analyze/route";
import { POST as reviewCase } from "@/app/api/cases/[id]/review/route";
import { GET as getAudit } from "@/app/api/cases/[id]/audit/route";
import { POST as resetDemo } from "@/app/api/demo/reset/route";
import { getCase } from "@/lib/db/repositories";
import { PRIMARY_SCENARIO } from "@/lib/demo/scenarios";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function submitPrimaryCase(): Promise<string> {
  const form = new FormData();
  form.set("residentId", PRIMARY_SCENARIO.residentId);
  form.set("submittedLocation", PRIMARY_SCENARIO.submittedLocation);
  form.set("residentNote", PRIMARY_SCENARIO.residentNote);
  form.set("scenarioId", PRIMARY_SCENARIO.id);
  form.set("sampleImage", PRIMARY_SCENARIO.imageFile);

  const response = await createCase(
    new NextRequest("http://localhost/api/cases", { method: "POST", body: form }),
  );
  expect(response.status).toBe(201);
  const data = (await response.json()) as { id: string; status: string };
  expect(data.status).toBe("SUBMITTED");
  return data.id;
}

beforeAll(() => {
  const image = path.join(process.cwd(), "public", "demo-images", PRIMARY_SCENARIO.imageFile);
  if (!fs.existsSync(image)) {
    throw new Error(`Missing demo image ${image}. Run: npm run gen:images`);
  }
});

describe("review endpoint enforcement", () => {
  it("rejects review actions while the case is still SUBMITTED", async () => {
    const id = await submitPrimaryCase();
    const response = await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, {
        action: "APPROVE",
        reviewNote: "trying to skip the workflow",
      }),
      ctx(id),
    );
    expect(response.status).toBe(409);
    expect(getCase(id)?.status).toBe("SUBMITTED");
  });

  it("rejects an unknown action", async () => {
    const id = await submitPrimaryCase();
    const response = await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, { action: "DISPATCH" }),
      ctx(id),
    );
    expect(response.status).toBe(400);
  });

  it("requires a reviewer note when the recommendation is changed", async () => {
    const id = await submitPrimaryCase();
    await analyzeCase(new Request("http://localhost"), ctx(id));

    const response = await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, {
        action: "APPROVE",
        finalPriority: "URGENT",
      }),
      ctx(id),
    );
    expect(response.status).toBe(400);
    expect(getCase(id)?.status).toBe("AWAITING_HUMAN_REVIEW");
  });

  it("refuses a vendor that is not on the approved list", async () => {
    const id = await submitPrimaryCase();
    await analyzeCase(new Request("http://localhost"), ctx(id));

    const response = await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, {
        action: "APPROVE",
        finalVendorId: "VEND-999",
        reviewNote: "unknown vendor",
      }),
      ctx(id),
    );
    expect(response.status).toBe(400);
  });

  it("does not allow a second decision after approval", async () => {
    const id = await submitPrimaryCase();
    await analyzeCase(new Request("http://localhost"), ctx(id));
    await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, { action: "APPROVE" }),
      ctx(id),
    );

    const second = await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, {
        action: "REJECT",
        reviewNote: "changed my mind",
      }),
      ctx(id),
    );
    expect(second.status).toBe(409);
  });

  it("records the authenticated Entra reviewer when Container Apps auth is present", async () => {
    const id = await submitPrimaryCase();
    await analyzeCase(new Request("http://localhost"), ctx(id));

    const request = jsonRequest(`http://localhost/api/cases/${id}/review`, { action: "APPROVE" });
    request.headers.set("x-ms-client-principal-name", "manager@contoso.example.invalid");

    const response = await reviewCase(request, ctx(id));
    expect(response.status).toBe(200);
    expect(getCase(id)?.reviewer_name).toBe("manager@contoso.example.invalid");
  });
});

describe("keynote demo integration flow", () => {
  it("runs reset -> submit -> analyze -> override -> approve -> audit", async () => {
    await resetDemo(new NextRequest("http://localhost/api/demo/reset", { method: "POST" }));

    const id = await submitPrimaryCase();

    const analyzed = await analyzeCase(new Request("http://localhost"), ctx(id));
    expect(analyzed.status).toBe(200);

    const afterAnalysis = getCase(id);
    expect(afterAnalysis?.status).toBe("AWAITING_HUMAN_REVIEW");
    expect(afterAnalysis?.asset_id).toBe(PRIMARY_SCENARIO.expectedAssetId);
    expect(afterAnalysis?.issue_category).toBe("POOL_GATE");
    expect(afterAnalysis?.recommended_priority).toBe("HIGH");
    // Warranty-first routing must select SecureGate Systems.
    expect(afterAnalysis?.recommended_vendor_id).toBe("VEND-001");
    expect(afterAnalysis?.draft_json).toBeTruthy();

    await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, { action: "START_REVIEW" }),
      ctx(id),
    );

    const approved = await reviewCase(
      jsonRequest(`http://localhost/api/cases/${id}/review`, {
        action: "APPROVE",
        finalPriority: "URGENT",
        finalVendorId: "VEND-001",
        reviewNote:
          "Youth swim program begins shortly; gate must be secured before pool opening.",
      }),
      ctx(id),
    );
    expect(approved.status).toBe(200);

    const final = getCase(id);
    expect(final?.final_priority).toBe("URGENT");
    expect(final?.status).toBe("SIMULATED_DISPATCH");
    expect(final?.override_count).toBe(1);
    expect(final?.approved_at).toBeTruthy();

    const auditResponse = await getAudit(new Request("http://localhost"), ctx(id));
    const audit = (await auditResponse.json()) as {
      events: Array<{ action: string; actorType: string }>;
      metrics: { humanOverrides: number; aiCalls: number };
    };
    const actions = audit.events.map((event) => event.action);

    for (const required of [
      "REQUEST_SUBMITTED",
      "AI_ANALYSIS_STARTED",
      "AI_ANALYSIS_COMPLETED",
      "ASSET_MATCHED",
      "WARRANTY_RETRIEVED",
      "MAINTENANCE_HISTORY_RETRIEVED",
      "SLA_APPLIED",
      "VENDOR_ROUTED",
      "DRAFT_GENERATED",
      "HUMAN_REVIEW_STARTED",
      "HUMAN_OVERRIDE_APPLIED",
      "HUMAN_APPROVED",
      "EXTERNAL_DISPATCH_SUPPRESSED",
    ]) {
      expect(actions).toContain(required);
    }

    const actors = new Set(audit.events.map((event) => event.actorType));
    expect(actors).toContain("RESIDENT");
    expect(actors).toContain("AI");
    expect(actors).toContain("SYSTEM");
    expect(actors).toContain("HUMAN_REVIEWER");

    expect(audit.metrics.humanOverrides).toBe(1);
    expect(audit.metrics.aiCalls).toBe(2);

    // Approval can only ever be attributed to a human reviewer.
    const approvalEvent = audit.events.find((event) => event.action === "HUMAN_APPROVED");
    expect(approvalEvent?.actorType).toBe("HUMAN_REVIEWER");
  });

  it("resets to a clean baseline without touching reference data", async () => {
    await submitPrimaryCase();
    const response = await resetDemo(
      new NextRequest("http://localhost/api/demo/reset", { method: "POST" }),
    );
    const data = (await response.json()) as {
      reset: boolean;
      casesRemoved: number;
      primaryImageReady: boolean;
      missingImages: string[];
    };

    expect(data.reset).toBe(true);
    expect(data.casesRemoved).toBeGreaterThan(0);
    expect(data.primaryImageReady).toBe(true);
    expect(data.missingImages).toHaveLength(0);
  });
});

describe("no API key is required anywhere", () => {
  it("does not read OPENAI_API_KEY or AZURE_OPENAI_API_KEY in source", () => {
    const roots = ["lib", "app", "components", "scripts"];
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(full, "utf8");
          if (/OPENAI_API_KEY|AZURE_OPENAI_API_KEY/.test(content)) offenders.push(full);
        }
      }
    };

    for (const root of roots) walk(path.join(process.cwd(), root));
    expect(offenders).toEqual([]);
  });
});
