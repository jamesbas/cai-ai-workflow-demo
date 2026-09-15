import { z } from "zod";

export const MaintenanceAnalysisSchema = z.object({
  issueCategory: z.enum([
    "POOL_GATE",
    "IRRIGATION_LEAK",
    "SITE_LIGHTING",
    "GENERAL_MAINTENANCE",
    "UNKNOWN",
  ]),
  assetType: z.string().max(80),
  locationHint: z.string().max(200),
  observations: z.array(z.string().max(400)).max(8),
  residentReportedFacts: z.array(z.string().max(400)).max(8),
  suggestedUrgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  urgencyReason: z.string().max(600),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  missingInformation: z.array(z.string().max(300)).max(8),
  requiresHumanReview: z.boolean(),
});

export type MaintenanceAnalysis = z.infer<typeof MaintenanceAnalysisSchema>;

export const WorkOrderDraftSchema = z.object({
  workOrderTitle: z.string().max(140),
  workOrderDescription: z.string().max(2500),
  residentAcknowledgement: z.string().max(2000),
  managerSummary: z.string().max(1200),
});

export type WorkOrderDraft = z.infer<typeof WorkOrderDraftSchema>;

/** Hand-written so it satisfies the Responses API strict json_schema rules. */
export const MAINTENANCE_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    issueCategory: {
      type: "string",
      enum: ["POOL_GATE", "IRRIGATION_LEAK", "SITE_LIGHTING", "GENERAL_MAINTENANCE", "UNKNOWN"],
    },
    assetType: { type: "string" },
    locationHint: { type: "string" },
    observations: { type: "array", items: { type: "string" } },
    residentReportedFacts: { type: "array", items: { type: "string" } },
    suggestedUrgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    urgencyReason: { type: "string" },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    missingInformation: { type: "array", items: { type: "string" } },
    requiresHumanReview: { type: "boolean" },
  },
  required: [
    "issueCategory",
    "assetType",
    "locationHint",
    "observations",
    "residentReportedFacts",
    "suggestedUrgency",
    "urgencyReason",
    "confidence",
    "missingInformation",
    "requiresHumanReview",
  ],
} as const;

export const WORK_ORDER_DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    workOrderTitle: { type: "string" },
    workOrderDescription: { type: "string" },
    residentAcknowledgement: { type: "string" },
    managerSummary: { type: "string" },
  },
  required: ["workOrderTitle", "workOrderDescription", "residentAcknowledgement", "managerSummary"],
} as const;
