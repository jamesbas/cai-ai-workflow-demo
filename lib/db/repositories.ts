import { getDb } from "@/lib/db/client";
import type {
  Asset,
  AuditEventRow,
  CaseRow,
  Community,
  MaintenanceRecord,
  Resident,
  SlaRule,
  Vendor,
} from "@/lib/types";

const CASE_COLUMNS = `id, community_id, resident_id, scenario_id, submitted_location, resident_note,
  image_name, image_mime, status, issue_category, asset_id, ai_analysis_json, context_json,
  draft_json, recommended_priority, final_priority, recommended_vendor_id, final_vendor_id,
  reviewer_name, review_note, work_order_title, work_order_description, ai_call_count,
  override_count, fixture_mode, created_at, updated_at, approved_at`;

export function getCommunity(id: string): Community | undefined {
  return getDb().prepare<[string], Community>("SELECT * FROM communities WHERE id = ?").get(id);
}

export function listResidents(): Resident[] {
  return getDb()
    .prepare<[], Resident>("SELECT * FROM residents ORDER BY display_name")
    .all();
}

export function getResident(id: string): Resident | undefined {
  return getDb().prepare<[string], Resident>("SELECT * FROM residents WHERE id = ?").get(id);
}

export function listVendors(): Vendor[] {
  return getDb().prepare<[], Vendor>("SELECT * FROM vendors ORDER BY name").all();
}

export function listApprovedVendors(): Vendor[] {
  return getDb()
    .prepare<[], Vendor>("SELECT * FROM vendors WHERE approved = 1 ORDER BY name")
    .all();
}

export function getVendor(id: string): Vendor | undefined {
  return getDb().prepare<[string], Vendor>("SELECT * FROM vendors WHERE id = ?").get(id);
}

export function findApprovedVendorByCategory(category: string): Vendor | undefined {
  return getDb()
    .prepare<[string], Vendor>(
      "SELECT * FROM vendors WHERE approved = 1 AND category = ? ORDER BY name LIMIT 1",
    )
    .get(category);
}

export function listAssets(): Asset[] {
  return getDb().prepare<[], Asset>("SELECT * FROM assets ORDER BY id").all();
}

export function getAsset(id: string): Asset | undefined {
  return getDb().prepare<[string], Asset>("SELECT * FROM assets WHERE id = ?").get(id);
}

export function listAssetsByType(assetType: string): Asset[] {
  return getDb()
    .prepare<[string], Asset>("SELECT * FROM assets WHERE asset_type = ? ORDER BY id")
    .all(assetType);
}

export type MaintenanceWithVendor = MaintenanceRecord & { vendor_name: string | null };

export function getMaintenanceHistory(assetId: string, limit = 3): MaintenanceWithVendor[] {
  return getDb()
    .prepare<[string, number], MaintenanceWithVendor>(
      `SELECT h.*, v.name AS vendor_name
       FROM maintenance_history h
       LEFT JOIN vendors v ON v.id = h.vendor_id
       WHERE h.asset_id = ?
       ORDER BY h.work_date DESC
       LIMIT ?`,
    )
    .all(assetId, limit);
}

export function getSlaForCategory(issueCategory: string): SlaRule | undefined {
  return getDb()
    .prepare<[string], SlaRule>("SELECT * FROM sla_rules WHERE issue_category = ? LIMIT 1")
    .get(issueCategory);
}

export interface NewCaseInput {
  id: string;
  communityId: string;
  residentId: string;
  scenarioId: string | null;
  submittedLocation: string;
  residentNote: string;
  imageName: string | null;
  imageMime: string | null;
  imageBlob: Buffer | null;
  status: string;
  createdAt: string;
}

export function insertCase(input: NewCaseInput): void {
  getDb()
    .prepare(
      `INSERT INTO cases (id, community_id, resident_id, scenario_id, submitted_location,
                          resident_note, image_name, image_mime, image_blob, status,
                          created_at, updated_at)
       VALUES (@id, @communityId, @residentId, @scenarioId, @submittedLocation,
               @residentNote, @imageName, @imageMime, @imageBlob, @status,
               @createdAt, @createdAt)`,
    )
    .run(input);
}

export function getCase(id: string): CaseRow | undefined {
  return getDb()
    .prepare<[string], CaseRow>(`SELECT ${CASE_COLUMNS} FROM cases WHERE id = ?`)
    .get(id);
}

export function listCases(limit = 50): CaseRow[] {
  return getDb()
    .prepare<[number], CaseRow>(
      `SELECT ${CASE_COLUMNS} FROM cases ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit);
}

export function getCaseImage(id: string): { blob: Buffer; mime: string } | null {
  const row = getDb()
    .prepare<[string], { image_blob: Buffer | null; image_mime: string | null }>(
      "SELECT image_blob, image_mime FROM cases WHERE id = ?",
    )
    .get(id);
  if (!row?.image_blob) return null;
  return { blob: row.image_blob, mime: row.image_mime ?? "application/octet-stream" };
}

/** Whitelisted column names only. Values are always bound parameters. */
const UPDATABLE_CASE_COLUMNS = [
  "status",
  "issue_category",
  "asset_id",
  "ai_analysis_json",
  "context_json",
  "draft_json",
  "recommended_priority",
  "final_priority",
  "recommended_vendor_id",
  "final_vendor_id",
  "reviewer_name",
  "review_note",
  "work_order_title",
  "work_order_description",
  "ai_call_count",
  "override_count",
  "fixture_mode",
  "approved_at",
] as const;

export type UpdatableCaseColumn = (typeof UPDATABLE_CASE_COLUMNS)[number];

export type CasePatch = Partial<Record<UpdatableCaseColumn, string | number | null>>;

export function updateCase(id: string, patch: CasePatch): void {
  const columns = Object.keys(patch).filter((key): key is UpdatableCaseColumn =>
    (UPDATABLE_CASE_COLUMNS as readonly string[]).includes(key),
  );
  if (columns.length === 0) return;

  const assignments = columns.map((column) => `${column} = @${column}`).join(", ");
  const params: Record<string, string | number | null> = { id, updated_at: new Date().toISOString() };
  for (const column of columns) params[column] = patch[column] ?? null;

  getDb()
    .prepare(`UPDATE cases SET ${assignments}, updated_at = @updated_at WHERE id = @id`)
    .run(params);
}

export function insertAuditEvent(row: AuditEventRow): void {
  getDb()
    .prepare(
      `INSERT INTO audit_events (id, case_id, event_time, seq, actor_type, actor_name, action,
                                 before_json, after_json, reason, correlation_id)
       VALUES (@id, @case_id, @event_time, @seq, @actor_type, @actor_name, @action,
               @before_json, @after_json, @reason, @correlation_id)`,
    )
    .run(row);
}

export function nextAuditSeq(caseId: string): number {
  const row = getDb()
    .prepare<[string], { next: number }>(
      "SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM audit_events WHERE case_id = ?",
    )
    .get(caseId);
  return row?.next ?? 1;
}

export function listAuditEvents(caseId: string): AuditEventRow[] {
  return getDb()
    .prepare<[string], AuditEventRow>(
      "SELECT * FROM audit_events WHERE case_id = ? ORDER BY seq ASC",
    )
    .all(caseId);
}

/** Removes generated demo activity. Reference/seed data is preserved. */
export function deleteGeneratedCases(): { cases: number; auditEvents: number } {
  const db = getDb();
  const run = db.transaction(() => {
    const auditEvents = db.prepare("DELETE FROM audit_events").run().changes;
    const cases = db.prepare("DELETE FROM cases").run().changes;
    return { cases, auditEvents };
  });
  return run();
}

export function databaseHealthy(): boolean {
  try {
    const row = getDb()
      .prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM assets")
      .get();
    return (row?.count ?? 0) > 0;
  } catch {
    return false;
  }
}
