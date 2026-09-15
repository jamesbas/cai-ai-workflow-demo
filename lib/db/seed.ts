import type Database from "better-sqlite3";
import type {
  Asset,
  Community,
  MaintenanceRecord,
  Resident,
  SlaRule,
  Vendor,
} from "@/lib/types";

/**
 * All seed data is synthetic. Emails use the reserved .invalid TLD so nothing
 * can be delivered, and phone numbers use the 555-01xx fictional range.
 */

export const SEED_COMMUNITY: Community = {
  id: "COM-001",
  name: "Chesapeake Oaks Community Association",
  timezone: "America/New_York",
  is_synthetic: 1,
};

export const SEED_RESIDENTS: Resident[] = [
  {
    id: "RES-001",
    community_id: "COM-001",
    display_name: "Avery Martin",
    property_address: "117 Harbor Walk, Demo Community",
    email: "avery.martin@example.invalid",
    is_synthetic: 1,
  },
  {
    id: "RES-002",
    community_id: "COM-001",
    display_name: "Jordan Lee",
    property_address: "42 Bayberry Court, Demo Community",
    email: "jordan.lee@example.invalid",
    is_synthetic: 1,
  },
];

export const SEED_VENDORS: Vendor[] = [
  {
    id: "VEND-001",
    name: "SecureGate Systems",
    category: "GATE_AND_ACCESS",
    email: "service@securegate.example.invalid",
    phone: "555-0101",
    approved: 1,
    is_synthetic: 1,
  },
  {
    id: "VEND-002",
    name: "Chesapeake Property Services",
    category: "GENERAL_MAINTENANCE",
    email: "dispatch@chesapeakeproperty.example.invalid",
    phone: "555-0102",
    approved: 1,
    is_synthetic: 1,
  },
  {
    id: "VEND-003",
    name: "Tidewater Irrigation LLC",
    category: "IRRIGATION",
    email: "service@tidewaterirrigation.example.invalid",
    phone: "555-0103",
    approved: 1,
    is_synthetic: 1,
  },
  {
    id: "VEND-004",
    name: "BrightPath Electric",
    category: "ELECTRICAL",
    email: "service@brightpath.example.invalid",
    phone: "555-0104",
    approved: 1,
    is_synthetic: 1,
  },
];

export const SEED_ASSETS: Asset[] = [
  {
    id: "PG-002",
    community_id: "COM-001",
    name: "East Pool Entry Gate",
    asset_type: "pool_gate",
    location: "East Pool Entrance",
    installed_date: "2024-06-15",
    status: "ACTIVE",
    preferred_vendor_id: "VEND-002",
    warranty_vendor_id: "VEND-001",
    warranty_expiration: "2027-05-31",
    notes: "Controlled-access pedestrian gate serving the east pool entrance.",
  },
  {
    id: "IRR-014",
    community_id: "COM-001",
    name: "Irrigation Zone 14",
    asset_type: "irrigation",
    location: "Greenway near Lot 42",
    installed_date: "2023-04-01",
    status: "ACTIVE",
    preferred_vendor_id: "VEND-003",
    warranty_vendor_id: null,
    warranty_expiration: null,
    notes: "Common-area irrigation serving the east greenway.",
  },
  {
    id: "LIGHT-009",
    community_id: "COM-001",
    name: "Walking Trail Pole Light 9",
    asset_type: "site_light",
    location: "East Walking Trail",
    installed_date: "2022-09-20",
    status: "ACTIVE",
    preferred_vendor_id: "VEND-004",
    warranty_vendor_id: null,
    warranty_expiration: null,
    notes: "LED pole light adjacent to trail intersection.",
  },
];

export const SEED_MAINTENANCE: MaintenanceRecord[] = [
  {
    id: "MH-1001",
    asset_id: "PG-002",
    work_date: "2026-08-12",
    vendor_id: "VEND-001",
    summary: "Adjusted latch alignment and tested self-closing mechanism.",
    status: "COMPLETED",
    cost: 185.0,
  },
  {
    id: "MH-0970",
    asset_id: "PG-002",
    work_date: "2026-05-03",
    vendor_id: "VEND-001",
    summary: "Lubricated hinges and inspected latch assembly.",
    status: "COMPLETED",
    cost: 120.0,
  },
  {
    id: "MH-0881",
    asset_id: "IRR-014",
    work_date: "2026-06-18",
    vendor_id: "VEND-003",
    summary: "Replaced broken spray nozzle and adjusted zone pressure.",
    status: "COMPLETED",
    cost: 145.0,
  },
  {
    id: "MH-0822",
    asset_id: "LIGHT-009",
    work_date: "2026-04-11",
    vendor_id: "VEND-004",
    summary: "Replaced LED driver and verified dusk-to-dawn control.",
    status: "COMPLETED",
    cost: 265.0,
  },
];

export const SEED_SLA_RULES: SlaRule[] = [
  {
    id: "SLA-POOL-GATE",
    issue_category: "POOL_GATE",
    default_priority: "HIGH",
    ack_minutes: 15,
    target_resolution_hours: 4,
    human_review_required: 1,
    description: "Pool access-control or gate issues require rapid manager review.",
  },
  {
    id: "SLA-IRRIGATION",
    issue_category: "IRRIGATION_LEAK",
    default_priority: "MEDIUM",
    ack_minutes: 60,
    target_resolution_hours: 24,
    human_review_required: 1,
    description:
      "Common-area irrigation leaks are normally same-day service unless they create a safety hazard.",
  },
  {
    id: "SLA-LIGHTING",
    issue_category: "SITE_LIGHTING",
    default_priority: "MEDIUM",
    ack_minutes: 60,
    target_resolution_hours: 24,
    human_review_required: 1,
    description:
      "Common-area lighting failures are normally next-business-day unless exposed wiring or immediate hazards are present.",
  },
  {
    id: "SLA-GENERAL",
    issue_category: "GENERAL_MAINTENANCE",
    default_priority: "MEDIUM",
    ack_minutes: 120,
    target_resolution_hours: 48,
    human_review_required: 1,
    description: "General common-area maintenance requests receive standard manager review.",
  },
];

/**
 * Idempotent. Reference rows are replaced so a redeploy always produces the
 * same baseline, while generated cases and audit events are left untouched.
 */
export function seedReferenceData(db: Database.Database): void {
  const seed = db.transaction(() => {
    db.prepare(
      `INSERT INTO communities (id, name, timezone, is_synthetic)
       VALUES (@id, @name, @timezone, @is_synthetic)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         timezone = excluded.timezone,
         is_synthetic = excluded.is_synthetic`,
    ).run(SEED_COMMUNITY);

    const resident = db.prepare(
      `INSERT INTO residents (id, community_id, display_name, property_address, email, is_synthetic)
       VALUES (@id, @community_id, @display_name, @property_address, @email, @is_synthetic)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         property_address = excluded.property_address,
         email = excluded.email`,
    );
    for (const row of SEED_RESIDENTS) resident.run(row);

    const vendor = db.prepare(
      `INSERT INTO vendors (id, name, category, email, phone, approved, is_synthetic)
       VALUES (@id, @name, @category, @email, @phone, @approved, @is_synthetic)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         category = excluded.category,
         email = excluded.email,
         phone = excluded.phone,
         approved = excluded.approved`,
    );
    for (const row of SEED_VENDORS) vendor.run(row);

    const asset = db.prepare(
      `INSERT INTO assets (id, community_id, name, asset_type, location, installed_date, status,
                           preferred_vendor_id, warranty_vendor_id, warranty_expiration, notes)
       VALUES (@id, @community_id, @name, @asset_type, @location, @installed_date, @status,
               @preferred_vendor_id, @warranty_vendor_id, @warranty_expiration, @notes)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         asset_type = excluded.asset_type,
         location = excluded.location,
         installed_date = excluded.installed_date,
         status = excluded.status,
         preferred_vendor_id = excluded.preferred_vendor_id,
         warranty_vendor_id = excluded.warranty_vendor_id,
         warranty_expiration = excluded.warranty_expiration,
         notes = excluded.notes`,
    );
    for (const row of SEED_ASSETS) asset.run(row);

    const history = db.prepare(
      `INSERT INTO maintenance_history (id, asset_id, work_date, vendor_id, summary, status, cost)
       VALUES (@id, @asset_id, @work_date, @vendor_id, @summary, @status, @cost)
       ON CONFLICT(id) DO UPDATE SET
         work_date = excluded.work_date,
         vendor_id = excluded.vendor_id,
         summary = excluded.summary,
         status = excluded.status,
         cost = excluded.cost`,
    );
    for (const row of SEED_MAINTENANCE) history.run(row);

    const sla = db.prepare(
      `INSERT INTO sla_rules (id, issue_category, default_priority, ack_minutes,
                              target_resolution_hours, human_review_required, description)
       VALUES (@id, @issue_category, @default_priority, @ack_minutes,
               @target_resolution_hours, @human_review_required, @description)
       ON CONFLICT(id) DO UPDATE SET
         issue_category = excluded.issue_category,
         default_priority = excluded.default_priority,
         ack_minutes = excluded.ack_minutes,
         target_resolution_hours = excluded.target_resolution_hours,
         human_review_required = excluded.human_review_required,
         description = excluded.description`,
    );
    for (const row of SEED_SLA_RULES) sla.run(row);
  });

  seed();
}
