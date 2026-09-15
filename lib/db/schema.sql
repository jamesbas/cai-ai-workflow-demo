-- CAI Demo 2 — SQLite schema
-- All data in this database is synthetic. See lib/db/seed.ts.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS communities (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  timezone     TEXT NOT NULL,
  is_synthetic INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS residents (
  id               TEXT PRIMARY KEY,
  community_id     TEXT NOT NULL REFERENCES communities(id),
  display_name     TEXT NOT NULL,
  property_address TEXT NOT NULL,
  email            TEXT,
  is_synthetic     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vendors (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  approved     INTEGER NOT NULL,
  is_synthetic INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS assets (
  id                  TEXT PRIMARY KEY,
  community_id        TEXT NOT NULL REFERENCES communities(id),
  name                TEXT NOT NULL,
  asset_type          TEXT NOT NULL,
  location            TEXT NOT NULL,
  installed_date      TEXT,
  status              TEXT NOT NULL,
  preferred_vendor_id TEXT REFERENCES vendors(id),
  warranty_vendor_id  TEXT REFERENCES vendors(id),
  warranty_expiration TEXT,
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_history (
  id        TEXT PRIMARY KEY,
  asset_id  TEXT NOT NULL REFERENCES assets(id),
  work_date TEXT NOT NULL,
  vendor_id TEXT REFERENCES vendors(id),
  summary   TEXT NOT NULL,
  status    TEXT NOT NULL,
  cost      REAL
);

CREATE TABLE IF NOT EXISTS sla_rules (
  id                      TEXT PRIMARY KEY,
  issue_category          TEXT NOT NULL,
  default_priority        TEXT NOT NULL,
  ack_minutes             INTEGER NOT NULL,
  target_resolution_hours INTEGER NOT NULL,
  human_review_required   INTEGER NOT NULL DEFAULT 1,
  description             TEXT
);

CREATE TABLE IF NOT EXISTS cases (
  id                    TEXT PRIMARY KEY,
  community_id          TEXT NOT NULL REFERENCES communities(id),
  resident_id           TEXT NOT NULL REFERENCES residents(id),
  scenario_id           TEXT,
  submitted_location    TEXT NOT NULL,
  resident_note         TEXT NOT NULL,
  image_name            TEXT,
  image_mime            TEXT,
  image_blob            BLOB,
  status                TEXT NOT NULL,
  issue_category        TEXT,
  asset_id              TEXT REFERENCES assets(id),
  ai_analysis_json      TEXT,
  context_json          TEXT,
  draft_json            TEXT,
  recommended_priority  TEXT,
  final_priority        TEXT,
  recommended_vendor_id TEXT REFERENCES vendors(id),
  final_vendor_id       TEXT REFERENCES vendors(id),
  reviewer_name         TEXT,
  review_note           TEXT,
  work_order_title      TEXT,
  work_order_description TEXT,
  ai_call_count         INTEGER NOT NULL DEFAULT 0,
  override_count        INTEGER NOT NULL DEFAULT 0,
  fixture_mode          INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  approved_at           TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id             TEXT PRIMARY KEY,
  case_id        TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_time     TEXT NOT NULL,
  seq            INTEGER NOT NULL,
  actor_type     TEXT NOT NULL,
  actor_name     TEXT NOT NULL,
  action         TEXT NOT NULL,
  before_json    TEXT,
  after_json     TEXT,
  reason         TEXT,
  correlation_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id, seq);
CREATE INDEX IF NOT EXISTS idx_history_asset ON maintenance_history(asset_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC);
