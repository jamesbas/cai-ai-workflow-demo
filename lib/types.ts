export type ActorType = "RESIDENT" | "AI" | "SYSTEM" | "HUMAN_REVIEWER";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/** The AI is deliberately not permitted to recommend URGENT. */
export type AiPriority = "LOW" | "MEDIUM" | "HIGH";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type IssueCategory =
  | "POOL_GATE"
  | "IRRIGATION_LEAK"
  | "SITE_LIGHTING"
  | "GENERAL_MAINTENANCE"
  | "UNKNOWN";

export interface Community {
  id: string;
  name: string;
  timezone: string;
  is_synthetic: number;
}

export interface Resident {
  id: string;
  community_id: string;
  display_name: string;
  property_address: string;
  email: string | null;
  is_synthetic: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  email: string | null;
  phone: string | null;
  approved: number;
  is_synthetic: number;
}

export interface Asset {
  id: string;
  community_id: string;
  name: string;
  asset_type: string;
  location: string;
  installed_date: string | null;
  status: string;
  preferred_vendor_id: string | null;
  warranty_vendor_id: string | null;
  warranty_expiration: string | null;
  notes: string | null;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  work_date: string;
  vendor_id: string | null;
  summary: string;
  status: string;
  cost: number | null;
}

export interface SlaRule {
  id: string;
  issue_category: string;
  default_priority: string;
  ack_minutes: number;
  target_resolution_hours: number;
  human_review_required: number;
  description: string | null;
}

export interface CaseRow {
  id: string;
  community_id: string;
  resident_id: string;
  scenario_id: string | null;
  submitted_location: string;
  resident_note: string;
  image_name: string | null;
  image_mime: string | null;
  status: string;
  issue_category: string | null;
  asset_id: string | null;
  ai_analysis_json: string | null;
  context_json: string | null;
  draft_json: string | null;
  recommended_priority: string | null;
  final_priority: string | null;
  recommended_vendor_id: string | null;
  final_vendor_id: string | null;
  reviewer_name: string | null;
  review_note: string | null;
  work_order_title: string | null;
  work_order_description: string | null;
  ai_call_count: number;
  override_count: number;
  fixture_mode: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface AuditEventRow {
  id: string;
  case_id: string;
  event_time: string;
  seq: number;
  actor_type: string;
  actor_name: string;
  action: string;
  before_json: string | null;
  after_json: string | null;
  reason: string | null;
  correlation_id: string | null;
}

export interface AssociationContext {
  asset: Asset | null;
  matchMethod: string;
  warranty: {
    vendorId: string | null;
    vendorName: string | null;
    expiration: string | null;
    active: boolean;
  };
  maintenanceHistory: Array<MaintenanceRecord & { vendor_name: string | null }>;
  sla: SlaRule | null;
  approvedVendors: Vendor[];
  recommendedVendorId: string | null;
  recommendedVendorName: string | null;
  routingReason: string;
  contextUsed: string[];
  contextExcluded: string[];
}
