import type { AssociationContext } from "@/lib/types";
import type { MaintenanceAnalysis } from "@/lib/ai/schemas";

const SHARED_SAFETY_RULES = `Operating rules you must follow at all times:
1. Report only what is visible in the supplied image or explicitly provided in text.
2. Keep observed facts and resident-reported facts strictly separate. Never restate a resident claim as something you saw.
3. Do not infer people, motives, ownership, legal status, fault, or liability.
4. Do not invent records, asset IDs, work-order history, warranty data, vendors, or SLA information.
5. Never state or imply that a work order has been created, sent, assigned, or dispatched.
6. Everything you produce is a draft for a human community manager to review.
7. If the evidence is ambiguous, say what information is missing and lower your confidence.
8. Use concise, neutral, operational language suitable for a community association manager.
9. Do not produce hidden reasoning or chain-of-thought. Return only the concise fields requested.
10. Always return output that matches the required JSON schema exactly.`;

export const ANALYSIS_SYSTEM_PROMPT = `You are a maintenance intake assistant for a community association. You interpret a resident-submitted photo and note so a community manager can triage the request faster.

${SHARED_SAFETY_RULES}

Additional rules for this task:
- Choose issueCategory from the permitted list only. Use UNKNOWN if nothing fits.
- suggestedUrgency may only be LOW, MEDIUM, or HIGH. You are not permitted to recommend URGENT; only a human reviewer may set that.
- confidence must be the qualitative label HIGH, MEDIUM, or LOW. Never output a numeric percentage.
- requiresHumanReview must always be true.
- observations must describe only what the image shows. If the image does not show a defect, say so plainly.
- urgencyReason must be one or two short sentences a manager can evaluate.
- Avoid legal, policy, enforcement, or fine-related conclusions.`;

export const DRAFT_SYSTEM_PROMPT = `You draft routine maintenance paperwork for a community association manager to review.

${SHARED_SAFETY_RULES}

Additional rules for this task:
- The asset, warranty, maintenance history, SLA, and vendor below were retrieved from the association's records by the application. Use them as given.
- You must not choose, change, or authorize a vendor. Vendor routing was already decided by application rules. You may reference the routed vendor by name only.
- Do not prefix any field with the word "Draft". The application already labels every generated field as a draft.
- Do not promise a completion time beyond the supplied SLA target.
- The resident acknowledgement must not confirm that anyone has been dispatched. It should say the request was received and is under review.
- managerSummary is two or three sentences of operational context for the reviewer, including anything the reviewer should verify.
- Write plainly. No marketing language, no apologies for the association, no legal commitments.`;

export interface AnalysisUserInput {
  residentName: string;
  submittedLocation: string;
  residentNote: string;
  permittedCategories: readonly string[];
}

export function buildAnalysisUserText(input: AnalysisUserInput): string {
  return [
    "A resident submitted a common-area maintenance request.",
    "",
    `Resident: ${input.residentName}`,
    `Submitted location: ${input.submittedLocation}`,
    `Resident note: "${input.residentNote}"`,
    "",
    `Permitted issueCategory values: ${input.permittedCategories.join(", ")}`,
    "",
    "The attached photo is the resident's submitted image. Analyze it and return the required JSON object.",
  ].join("\n");
}

export interface DraftUserInput {
  analysis: MaintenanceAnalysis;
  context: AssociationContext;
  communityName: string;
  residentName: string;
  submittedLocation: string;
  residentNote: string;
}

export function buildDraftUserText(input: DraftUserInput): string {
  const { analysis, context } = input;
  const asset = context.asset;

  const historyLines =
    context.maintenanceHistory.length > 0
      ? context.maintenanceHistory
          .map(
            (record) =>
              `- ${record.work_date}: ${record.summary} (vendor: ${record.vendor_name ?? "unrecorded"}, status: ${record.status})`,
          )
          .join("\n")
      : "- No prior maintenance records on file for this asset.";

  return [
    `Community: ${input.communityName} (synthetic demonstration data)`,
    `Resident: ${input.residentName}`,
    `Submitted location: ${input.submittedLocation}`,
    `Resident note: "${input.residentNote}"`,
    "",
    "AI intake analysis (already reviewed for accuracy of separation):",
    `- Issue category: ${analysis.issueCategory}`,
    `- Observed in image: ${analysis.observations.join(" | ") || "none recorded"}`,
    `- Reported by resident: ${analysis.residentReportedFacts.join(" | ") || "none recorded"}`,
    `- Suggested urgency: ${analysis.suggestedUrgency} (${analysis.urgencyReason})`,
    `- Confidence: ${analysis.confidence}`,
    `- Missing information: ${analysis.missingInformation.join(" | ") || "none recorded"}`,
    "",
    "Association records retrieved by the application:",
    asset
      ? `- Matched asset: ${asset.id} — ${asset.name} (${asset.asset_type}), location ${asset.location}, status ${asset.status}`
      : "- Matched asset: none. The reviewer must identify the asset.",
    asset?.notes ? `- Asset notes: ${asset.notes}` : "",
    `- Warranty: ${
      context.warranty.active
        ? `active through ${context.warranty.expiration} with ${context.warranty.vendorName}`
        : "no active warranty on file"
    }`,
    "- Recent maintenance history:",
    historyLines,
    context.sla
      ? `- Applicable SLA ${context.sla.id}: acknowledge within ${context.sla.ack_minutes} minutes, target resolution ${context.sla.target_resolution_hours} hours, default priority ${context.sla.default_priority}`
      : "- Applicable SLA: none matched",
    `- Vendor routed by application rules: ${context.recommendedVendorName ?? "none"} (${context.routingReason})`,
    "",
    "Produce the draft work order fields. Everything is a draft pending human approval.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
