# CAI Demo 2 — Application Build Specification

**File:** `CAI-Demo2-Spec.md`  
**Purpose:** Build the second live demo application for the CAI Chesapeake Region Chapter 2026 keynote.  
**Demo concept:** Multimodal maintenance intake → connected association context → draft work order → human approval gate → audit trail.  
**Target deployment:** Microsoft Azure Container Apps  
**Primary AI platform:** Microsoft Foundry / Azure AI  
**Database:** SQLite  
**Authentication:** Microsoft Entra ID only; no API keys  
**Audience:** HOA/condo board members, community managers, attorneys, service providers, and technology leaders

---

## 1. Executive build goal

Build a small, reliable, keynote-ready web application that demonstrates the difference between:

1. a standalone AI assistant that answers questions; and
2. AI operating inside a connected business workflow with human control.

The application must allow a synthetic resident to submit a maintenance issue with a photo and short note. A multimodal AI model analyzes the submission, separates observable facts from resident-reported facts, classifies the likely maintenance issue, and recommends an urgency level. The application then retrieves synthetic asset, warranty, maintenance-history, SLA, and vendor data from SQLite.

The application prepares:

- a draft work order;
- a draft resident acknowledgement;
- a recommended route/vendor based on application data and rules; and
- an audit record of every step.

A human reviewer must be able to edit, reroute, reject, or approve the work order. **The AI must never be able to approve or dispatch the work order.** Approval is enforced by normal application code and workflow state, not by prompting.

The application runs in **Demo Mode**. No real vendor dispatch, email, text message, or resident communication is permitted.

---

## 2. Keynote message the application must reinforce

The application exists to make four governance concepts visible:

| Guardrail | What the application must show |
|---|---|
| Data boundaries | The UI shows exactly what data the AI was allowed to use and what data was out of scope. |
| Human review | A reviewer must explicitly approve, edit, reroute, or reject the draft. |
| Escalation | Ambiguous or exceptional cases can be routed for additional review. |
| Auditability | Every AI, system, and human action is timestamped and recorded. |

The application should also reinforce this operating principle:

> **AI runs the routine; humans decide what matters.**

Routine and reversible steps may be automated. Anything consequential remains under human control.

---

## 3. Scope

### 3.1 In scope

The V1 keynote application must support:

- one primary maintenance scenario: broken pool access gate;
- at least two alternate seeded scenarios for rehearsal/Q&A;
- image + resident-note intake;
- multimodal AI analysis;
- structured AI output;
- SQLite asset and maintenance lookup;
- warranty and approved-vendor lookup;
- SLA lookup;
- draft work-order generation;
- draft resident acknowledgement generation;
- human review and override;
- approval/rejection/reroute workflow;
- audit timeline;
- visible AI context/data boundary;
- visible Demo Mode status;
- one-click Reset Demo function;
- Microsoft Entra authentication for Foundry calls;
- Azure Container Apps deployment;
- deterministic seed/reset behavior;
- health/readiness endpoint;
- screenshots/fixture mode for rehearsal and fallback validation.

### 3.2 Explicitly out of scope

Do not build:

- a production HOA platform;
- a real work-order integration;
- a real email/SMS integration;
- a real vendor dispatch integration;
- real resident/property data;
- payment, collections, violation, fine, or enforcement functionality;
- custom computer-vision model training;
- an autonomous agent that can take external actions;
- broad internet search;
- a complex multi-agent architecture;
- long-term production-grade persistence;
- multi-community tenancy beyond the single synthetic demo community.

---

## 4. Azure environment

Use the following existing Azure resources.

### 4.1 Subscription

- **Subscription name:** `<your-subscription-name>`
- **Subscription ID:** `<your-subscription-id>`

### 4.2 Resource group

- **Existing resource group:** `rgCAI`

All new Azure resources for this demo must be created inside `rgCAI`.

### 4.3 Microsoft Foundry project

- **Project endpoint:**  
  `https://<your-foundry-resource>.services.ai.azure.com/api/projects/<your-project>`

### 4.4 Preferred model deployment

- **Deployment/model name:** `gpt-5.6-terra`
- **Provided resource Responses endpoint:**  
  `https://<your-foundry-resource>.services.ai.azure.com/openai/v1/responses`

For application code, prefer the **Foundry project endpoint** and append `/openai/v1` when creating the OpenAI-compatible client:

`https://<your-foundry-resource>.services.ai.azure.com/api/projects/<your-project>/openai/v1`

This keeps the application project-scoped and aligns with current Foundry SDK/OpenAI-client patterns.

### 4.5 Authentication requirement

API-key authentication is disabled. **Do not store, request, or use any API key.**

Use Microsoft Entra ID:

- local development: `DefaultAzureCredential` using the developer's Azure CLI sign-in;
- Container Apps: system-assigned managed identity;
- token scope: `https://ai.azure.com/.default`;
- grant the Container App managed identity the minimum Foundry project role needed for inference, normally **Foundry User** on the Foundry project.

No secret should be required for AI inference.

---

## 5. Recommended application stack

Use a single TypeScript codebase unless there is a compelling implementation reason not to.

### Front end and server

- current stable **Next.js** with App Router;
- **React**;
- **TypeScript** with strict mode;
- server-side route handlers for all AI and database operations;
- responsive layout optimized for a keynote laptop at 16:9 resolution.

### AI client

Use:

- `openai`
- `@azure/identity`

Recommended authentication pattern:

```ts
import OpenAI from "openai";
import {
  DefaultAzureCredential,
  getBearerTokenProvider
} from "@azure/identity";

const credential = new DefaultAzureCredential();

const tokenProvider = getBearerTokenProvider(
  credential,
  "https://ai.azure.com/.default"
);

const projectEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT!;

export const aiClient = new OpenAI({
  baseURL: `${projectEndpoint.replace(/\/$/, "")}/openai/v1`,
  apiKey: tokenProvider
});
```

Use the Responses API and deployment name `gpt-5.6-terra`.

### Database

Use SQLite through one of:

- `better-sqlite3` — preferred for simplicity;
- Prisma + SQLite — acceptable if the developer prefers migrations and typed access.

Do not introduce a network database for this keynote demo.

### Styling

Use either:

- Tailwind CSS; or
- simple CSS modules.

Prioritize readability over visual complexity.

### Containerization

- multi-stage Docker build;
- Node LTS runtime;
- non-root runtime user where practical;
- `/app/data` directory for SQLite;
- port exposed through `PORT`;
- health endpoint at `/api/health`.

---

## 6. Agent decision

### Do not create a Foundry Agent for V1

A Foundry Agent is **not required** for this demo.

The demo is intentionally a **guided workflow**, not an autonomous agent. Direct model calls are preferable because they:

- reduce moving parts;
- improve stage reliability;
- keep business authority in application code;
- make audit behavior easier to explain;
- align with the keynote's Phase 2 "Guided Workflows" message.

Create an agent only later if the application genuinely needs dynamic tool selection or multi-step autonomous coordination. It should not be introduced simply to make the demo appear more "agentic."

---

## 7. Application design

The application should feel like one workflow rather than several separate pages.

### 7.1 Primary UI layout

Build a single main demo workspace containing progressive sections/cards:

1. **Maintenance Request**
2. **AI Analysis**
3. **Connected Association Context**
4. **Draft Work Order**
5. **Human Review**
6. **Audit Trail**

Only the first section is expanded on initial load. Each next section becomes available when its step completes.

Always display a visible banner:

> **DEMO MODE — Synthetic data. No external dispatch or communication.**

### 7.2 Navigation

Top navigation:

- `Demo`
- `Cases`
- `Reset Demo`
- `System Status`

Optional reviewer identity display:

- authenticated Entra display name if Container Apps authentication is enabled;
- otherwise `Demo Reviewer` with a clear synthetic/demo label.

---

## 8. Primary demo scenario

### Scenario ID

`SCENARIO-POOL-GATE`

### Resident submission

**Resident:** Avery Martin  
**Community:** Chesapeake Oaks Community Association  
**Location:** East Pool Entrance  
**Resident note:**

> The east pool gate won't latch and keeps swinging open. I tried closing it twice.

### Image

Required demo image filename:

`public/demo-images/pool-gate-broken.jpg`

The image must be synthetic or staged. It must not show:

- a real resident;
- a readable license plate;
- personally identifying information.

The image should clearly show a pool access gate that is open or visibly misaligned.

### Expected AI interpretation

The exact words can vary, but the result should normally resemble:

- **Category:** Pool access gate / latch failure
- **Observed:** Gate appears open or not fully secured.
- **Resident reported:** Gate will not latch and swings open.
- **Suggested urgency:** HIGH
- **Reason:** Controlled-access pool gate may present a safety/access-control issue.
- **Confidence:** HIGH or MEDIUM
- **Human review required:** true

The model must not claim that it directly observed a failed latch unless that failure is visually evident.

---

## 9. Required AI behavior

Use **two AI calls**, not one giant prompt.

### Call 1 — Interpret the maintenance submission

Inputs:

- uploaded image;
- resident note;
- submitted location;
- permitted issue categories.

The model must:

- describe directly observable facts;
- separately list resident-reported facts;
- classify the issue;
- suggest urgency;
- explain the urgency briefly;
- identify missing information;
- return a qualitative confidence label;
- avoid legal conclusions;
- avoid policy/enforcement conclusions;
- never invent asset IDs, work-order history, warranty data, vendors, or SLA information.

Required structured output:

```json
{
  "issueCategory": "POOL_GATE",
  "assetType": "pool_gate",
  "locationHint": "East Pool Entrance",
  "observations": [
    "A gate is visible in an open position."
  ],
  "residentReportedFacts": [
    "The gate does not latch.",
    "The gate swings open after being closed."
  ],
  "suggestedUrgency": "HIGH",
  "urgencyReason": "A malfunctioning controlled-access pool gate may create a safety and access-control concern.",
  "confidence": "HIGH",
  "missingInformation": [],
  "requiresHumanReview": true
}
```

Use qualitative confidence only:

- `HIGH`
- `MEDIUM`
- `LOW`

Do **not** display a fabricated percentage such as "87% confidence."

### Call 2 — Draft operational language

Run only after the application has retrieved deterministic association context from SQLite.

Inputs:

- AI Call 1 structured result;
- matched asset record;
- warranty status;
- recent maintenance history;
- selected SLA;
- application-selected vendor;
- explicit instruction that all output is a draft.

The model returns:

```json
{
  "workOrderTitle": "East Pool Gate Will Not Latch",
  "workOrderDescription": "Inspect the east pool entry gate and latch assembly...",
  "residentAcknowledgement": "Thank you for reporting the east pool gate issue...",
  "managerSummary": "The request appears to involve a pool access gate..."
}
```

The model must **not** choose or authorize the vendor. Vendor routing belongs to application rules.

---

## 10. Model-input safety rules

System instructions must include these requirements:

1. Report only what is visible or explicitly provided.
2. Separate **observed facts** from **reported facts**.
3. Do not infer people, motives, ownership, legal status, fault, or liability.
4. Do not invent records or history.
5. Do not claim that a work order has been sent.
6. Treat all generated text as a draft.
7. If evidence is ambiguous, say what is missing and lower the confidence.
8. Use concise operational language suitable for a community manager.
9. Do not produce hidden chain-of-thought. Return only the requested concise rationale fields.
10. Always return structured output matching the schema.

---

## 11. Structured data lookup

The AI must never query SQLite directly.

Application code performs all database lookup after Call 1.

Suggested logic:

1. Normalize `issueCategory`, `assetType`, and `locationHint`.
2. Match a known asset.
3. Load:
   - asset record;
   - warranty;
   - last three related maintenance records;
   - applicable SLA rule;
   - approved vendors.
4. Select the initial recommended vendor deterministically:
   - active warranty provider first;
   - otherwise asset preferred vendor;
   - otherwise approved category vendor.
5. Log exactly what data was supplied to Call 2.

---

## 12. Human approval architecture

The workflow must be enforced in code.

### 12.1 Allowed state transitions

```text
SUBMITTED
  -> AI_ANALYZED
  -> CONTEXT_ENRICHED
  -> DRAFT_READY
  -> AWAITING_HUMAN_REVIEW
     -> APPROVED
     -> REJECTED
     -> REROUTED
```

After `APPROVED`:

```text
APPROVED
  -> SIMULATED_DISPATCH
```

There is **no** transition from an AI action directly to `APPROVED`.

### 12.2 Server-side enforcement

The approval endpoint must verify:

- current state is `AWAITING_HUMAN_REVIEW`;
- reviewer identity is present;
- reviewer explicitly selected an action;
- any changed field is recorded;
- override reason is captured when required.

The model has no API/tool capable of calling the approval endpoint.

### 12.3 Demo-mode dispatch

`DEMO_EXTERNAL_DISPATCH=false`

Even after approval, the application must never call an external vendor, email service, SMS service, or resident system.

The UI should display:

> **Approved — external dispatch suppressed in Demo Mode**

---

## 13. Human override built into the keynote scenario

The UI must support manager priority values:

- LOW
- MEDIUM
- HIGH
- URGENT

The AI may recommend only:

- LOW
- MEDIUM
- HIGH

This guarantees that the presenter can visibly exercise human judgment.

For the keynote, the model is expected to return `HIGH`.

The presenter changes it to:

`URGENT`

and enters the review note:

> Youth swim program begins shortly; gate must be secured before pool opening.

This fact is intentionally outside the AI's supplied context. It demonstrates why a manager still owns the operational decision.

If the model unexpectedly returns a different value, the presenter can still edit:

- priority;
- work-order description;
- vendor;
- manager note.

At least one human edit must appear in the audit trail.

---

## 14. Visible data-boundary panel

The demo must include a small expandable panel called:

**Context Used**

Example:

### AI was allowed to use

- submitted photo;
- resident's note;
- submitted location;
- matched asset PG-002;
- last three maintenance records for PG-002;
- PG-002 warranty details;
- applicable maintenance SLA;
- approved maintenance-vendor routing data.

### AI was not allowed to use

- resident financial records;
- unrelated resident records;
- legal correspondence;
- executive-session material;
- violation/enforcement history;
- unrelated community data.

This panel is important because it makes the keynote's "Data Boundaries" guardrail tangible.

---

## 15. Audit trail

Every event must include:

- event ID;
- case ID;
- timestamp in UTC;
- actor type;
- actor display name or service;
- action;
- before value when applicable;
- after value when applicable;
- concise reason;
- correlation/request ID.

Actor types:

- `RESIDENT`
- `AI`
- `SYSTEM`
- `HUMAN_REVIEWER`

Required events for the primary scenario:

```text
REQUEST_SUBMITTED
AI_ANALYSIS_STARTED
AI_ANALYSIS_COMPLETED
ASSET_MATCHED
WARRANTY_RETRIEVED
MAINTENANCE_HISTORY_RETRIEVED
SLA_APPLIED
VENDOR_ROUTED
DRAFT_GENERATED
HUMAN_REVIEW_STARTED
HUMAN_OVERRIDE_APPLIED
HUMAN_APPROVED
EXTERNAL_DISPATCH_SUPPRESSED
```

The UI should visually distinguish AI, system, and human events.

---

## 16. Operational metrics shown in the demo

At the top of the audit panel display:

- elapsed workflow time;
- AI calls;
- human overrides;
- final state.

Example:

```text
Elapsed time: 37 sec
AI calls: 2
Human overrides: 1
Final state: APPROVED / DEMO DISPATCH SUPPRESSED
```

These metrics connect the demo to the later keynote slide about scoring a pilot before scaling it.

---

## 17. SQLite schema

Create migrations or initialization SQL for the following tables.

### `communities`

```text
id TEXT PRIMARY KEY
name TEXT NOT NULL
timezone TEXT NOT NULL
is_synthetic INTEGER NOT NULL DEFAULT 1
```

### `residents`

```text
id TEXT PRIMARY KEY
community_id TEXT NOT NULL
display_name TEXT NOT NULL
property_address TEXT NOT NULL
email TEXT
is_synthetic INTEGER NOT NULL DEFAULT 1
```

### `vendors`

```text
id TEXT PRIMARY KEY
name TEXT NOT NULL
category TEXT NOT NULL
email TEXT
phone TEXT
approved INTEGER NOT NULL
is_synthetic INTEGER NOT NULL DEFAULT 1
```

### `assets`

```text
id TEXT PRIMARY KEY
community_id TEXT NOT NULL
name TEXT NOT NULL
asset_type TEXT NOT NULL
location TEXT NOT NULL
installed_date TEXT
status TEXT NOT NULL
preferred_vendor_id TEXT
warranty_vendor_id TEXT
warranty_expiration TEXT
notes TEXT
```

### `maintenance_history`

```text
id TEXT PRIMARY KEY
asset_id TEXT NOT NULL
work_date TEXT NOT NULL
vendor_id TEXT
summary TEXT NOT NULL
status TEXT NOT NULL
cost REAL
```

### `sla_rules`

```text
id TEXT PRIMARY KEY
issue_category TEXT NOT NULL
default_priority TEXT NOT NULL
ack_minutes INTEGER NOT NULL
target_resolution_hours INTEGER NOT NULL
human_review_required INTEGER NOT NULL DEFAULT 1
description TEXT
```

### `cases`

```text
id TEXT PRIMARY KEY
community_id TEXT NOT NULL
resident_id TEXT NOT NULL
scenario_id TEXT
submitted_location TEXT NOT NULL
resident_note TEXT NOT NULL
image_name TEXT
image_blob BLOB
status TEXT NOT NULL
issue_category TEXT
asset_id TEXT
ai_analysis_json TEXT
context_json TEXT
draft_json TEXT
recommended_priority TEXT
final_priority TEXT
recommended_vendor_id TEXT
final_vendor_id TEXT
reviewer_name TEXT
review_note TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
approved_at TEXT
```

### `audit_events`

```text
id TEXT PRIMARY KEY
case_id TEXT NOT NULL
event_time TEXT NOT NULL
actor_type TEXT NOT NULL
actor_name TEXT NOT NULL
action TEXT NOT NULL
before_json TEXT
after_json TEXT
reason TEXT
correlation_id TEXT
```

---

## 18. Seed data

All data must be obviously synthetic.

### 18.1 Community

```json
{
  "id": "COM-001",
  "name": "Chesapeake Oaks Community Association",
  "timezone": "America/New_York",
  "is_synthetic": 1
}
```

### 18.2 Residents

```json
[
  {
    "id": "RES-001",
    "community_id": "COM-001",
    "display_name": "Avery Martin",
    "property_address": "117 Harbor Walk, Demo Community",
    "email": "avery.martin@example.invalid",
    "is_synthetic": 1
  },
  {
    "id": "RES-002",
    "community_id": "COM-001",
    "display_name": "Jordan Lee",
    "property_address": "42 Bayberry Court, Demo Community",
    "email": "jordan.lee@example.invalid",
    "is_synthetic": 1
  }
]
```

### 18.3 Vendors

```json
[
  {
    "id": "VEND-001",
    "name": "SecureGate Systems",
    "category": "GATE_AND_ACCESS",
    "email": "service@securegate.example.invalid",
    "phone": "555-0101",
    "approved": 1,
    "is_synthetic": 1
  },
  {
    "id": "VEND-002",
    "name": "Chesapeake Property Services",
    "category": "GENERAL_MAINTENANCE",
    "email": "dispatch@chesapeakeproperty.example.invalid",
    "phone": "555-0102",
    "approved": 1,
    "is_synthetic": 1
  },
  {
    "id": "VEND-003",
    "name": "Tidewater Irrigation LLC",
    "category": "IRRIGATION",
    "email": "service@tidewaterirrigation.example.invalid",
    "phone": "555-0103",
    "approved": 1,
    "is_synthetic": 1
  },
  {
    "id": "VEND-004",
    "name": "BrightPath Electric",
    "category": "ELECTRICAL",
    "email": "service@brightpath.example.invalid",
    "phone": "555-0104",
    "approved": 1,
    "is_synthetic": 1
  }
]
```

### 18.4 Assets

```json
[
  {
    "id": "PG-002",
    "community_id": "COM-001",
    "name": "East Pool Entry Gate",
    "asset_type": "pool_gate",
    "location": "East Pool Entrance",
    "installed_date": "2024-06-15",
    "status": "ACTIVE",
    "preferred_vendor_id": "VEND-002",
    "warranty_vendor_id": "VEND-001",
    "warranty_expiration": "2027-05-31",
    "notes": "Controlled-access pedestrian gate serving the east pool entrance."
  },
  {
    "id": "IRR-014",
    "community_id": "COM-001",
    "name": "Irrigation Zone 14",
    "asset_type": "irrigation",
    "location": "Greenway near Lot 42",
    "installed_date": "2023-04-01",
    "status": "ACTIVE",
    "preferred_vendor_id": "VEND-003",
    "warranty_vendor_id": null,
    "warranty_expiration": null,
    "notes": "Common-area irrigation serving the east greenway."
  },
  {
    "id": "LIGHT-009",
    "community_id": "COM-001",
    "name": "Walking Trail Pole Light 9",
    "asset_type": "site_light",
    "location": "East Walking Trail",
    "installed_date": "2022-09-20",
    "status": "ACTIVE",
    "preferred_vendor_id": "VEND-004",
    "warranty_vendor_id": null,
    "warranty_expiration": null,
    "notes": "LED pole light adjacent to trail intersection."
  }
]
```

### 18.5 Maintenance history

```json
[
  {
    "id": "MH-1001",
    "asset_id": "PG-002",
    "work_date": "2026-08-12",
    "vendor_id": "VEND-001",
    "summary": "Adjusted latch alignment and tested self-closing mechanism.",
    "status": "COMPLETED",
    "cost": 185.00
  },
  {
    "id": "MH-0970",
    "asset_id": "PG-002",
    "work_date": "2026-05-03",
    "vendor_id": "VEND-001",
    "summary": "Lubricated hinges and inspected latch assembly.",
    "status": "COMPLETED",
    "cost": 120.00
  },
  {
    "id": "MH-0881",
    "asset_id": "IRR-014",
    "work_date": "2026-06-18",
    "vendor_id": "VEND-003",
    "summary": "Replaced broken spray nozzle and adjusted zone pressure.",
    "status": "COMPLETED",
    "cost": 145.00
  },
  {
    "id": "MH-0822",
    "asset_id": "LIGHT-009",
    "work_date": "2026-04-11",
    "vendor_id": "VEND-004",
    "summary": "Replaced LED driver and verified dusk-to-dawn control.",
    "status": "COMPLETED",
    "cost": 265.00
  }
]
```

### 18.6 SLA rules

```json
[
  {
    "id": "SLA-POOL-GATE",
    "issue_category": "POOL_GATE",
    "default_priority": "HIGH",
    "ack_minutes": 15,
    "target_resolution_hours": 4,
    "human_review_required": 1,
    "description": "Pool access-control or gate issues require rapid manager review."
  },
  {
    "id": "SLA-IRRIGATION",
    "issue_category": "IRRIGATION_LEAK",
    "default_priority": "MEDIUM",
    "ack_minutes": 60,
    "target_resolution_hours": 24,
    "human_review_required": 1,
    "description": "Common-area irrigation leaks are normally same-day service unless they create a safety hazard."
  },
  {
    "id": "SLA-LIGHTING",
    "issue_category": "SITE_LIGHTING",
    "default_priority": "MEDIUM",
    "ack_minutes": 60,
    "target_resolution_hours": 24,
    "human_review_required": 1,
    "description": "Common-area lighting failures are normally next-business-day unless exposed wiring or immediate hazards are present."
  }
]
```

---

## 19. Alternate seeded demo scenarios

### 19.1 Irrigation leak

Image:

`public/demo-images/irrigation-leak.jpg`

Resident note:

> Water has been running across the walking path near Lot 42 for about 20 minutes.

Expected category:

`IRRIGATION_LEAK`

Expected matched asset:

`IRR-014`

### 19.2 Damaged or failed trail light

Image:

`public/demo-images/trail-light.jpg`

Resident note:

> The light at the east trail intersection has been out for two nights.

Expected category:

`SITE_LIGHTING`

Expected matched asset:

`LIGHT-009`

These scenarios are primarily for rehearsal, fallback, and Q&A.

---

## 20. API/routes

Implement the following server routes.

### `GET /api/health`

Return:

```json
{
  "status": "ok",
  "database": "ok",
  "foundry": "ok",
  "demoMode": true
}
```

Do not make a full AI inference on every health request. Cache Foundry connectivity status.

### `POST /api/cases`

Create a new maintenance request.

Input:

- resident ID;
- submitted location;
- resident note;
- image.

Return case ID and state `SUBMITTED`.

### `POST /api/cases/:id/analyze`

- writes `AI_ANALYSIS_STARTED`;
- calls AI Call 1;
- validates structured output;
- writes `AI_ANALYSIS_COMPLETED`;
- matches SQLite asset;
- retrieves context;
- routes vendor;
- calls AI Call 2;
- transitions to `AWAITING_HUMAN_REVIEW`.

### `GET /api/cases/:id`

Returns the full presentation-safe case view.

### `POST /api/cases/:id/review`

Body:

```json
{
  "action": "APPROVE",
  "finalPriority": "URGENT",
  "finalVendorId": "VEND-001",
  "reviewNote": "Youth swim program begins shortly; gate must be secured before pool opening."
}
```

Valid actions:

- `APPROVE`
- `REJECT`
- `REROUTE`

Enforce allowed state transitions server-side.

### `GET /api/cases/:id/audit`

Return ordered audit events.

### `POST /api/demo/reset`

- delete generated demo cases/audit events;
- preserve seed/reference data;
- verify the primary sample image exists;
- return the application to its initial stage state.

Protect reset behind reviewer/admin access if inbound Entra auth is enabled.

---

## 21. UI requirements

### 21.1 Intake card

Fields:

- resident;
- location;
- resident note;
- image upload;
- `Use keynote sample` button.

The keynote sample button loads:

- Avery Martin;
- East Pool Entrance;
- predefined note;
- pool-gate image.

### 21.2 AI Analysis card

Show:

- issue type;
- observations;
- resident-reported facts;
- suggested urgency;
- concise reason;
- confidence;
- missing information.

Use labels:

- **Observed in image**
- **Reported by resident**

Do not merge the two.

### 21.3 Connected Context card

Show:

- matched asset;
- last maintenance date;
- last two/three work records;
- warranty expiration;
- warranty status;
- approved/warranty vendor;
- SLA;
- `Context Used` expandable panel.

Use a short headline:

> **From association records — not model memory**

### 21.4 Draft Work Order card

Show:

- title;
- asset;
- priority;
- vendor;
- target response;
- description;
- draft resident acknowledgement.

Every generated field must display a `Draft` badge.

### 21.5 Human Review card

Controls:

- priority dropdown;
- vendor dropdown;
- editable work-order text;
- reviewer note;
- `Approve`;
- `Reroute`;
- `Reject`.

Do not auto-submit.

### 21.6 Audit card

Show a vertical timeline with actor icons:

- Resident
- AI
- System
- Human

Highlight the human override.

---

## 22. Entra identity and authorization

### 22.1 Foundry authentication — mandatory

Use `DefaultAzureCredential`.

Local:

```bash
az login
az account set --subscription <your-subscription-id>
```

Container App:

- enable system-assigned managed identity;
- grant it **Foundry User** on the Foundry project;
- do not configure `OPENAI_API_KEY`;
- do not configure `AZURE_OPENAI_API_KEY`.

### 22.2 User-facing application authentication — recommended

For the deployed Container App, enable built-in Azure Container Apps authentication with Microsoft Entra ID.

Configure:

- authentication required;
- unauthenticated requests return 401/redirect to sign-in;
- restrict access to the appropriate Microsoft Entra tenant;
- preload/sign in before the keynote.

If this is enabled, read the authenticated principal from Container Apps auth headers and use it as the human reviewer identity.

This authentication is separate from the managed identity used for Foundry calls.

---

## 23. Environment variables

Create `.env.example` with:

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=rgCAI

FOUNDRY_PROJECT_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/api/projects/<your-project>
FOUNDRY_MODEL=gpt-5.6-terra

DATABASE_PATH=/app/data/cai-demo2.db

DEMO_MODE=true
DEMO_EXTERNAL_DISPATCH=false
DEMO_AI_TIMEOUT_MS=20000
DEMO_FIXTURE_MODE=false

NEXT_PUBLIC_APP_TITLE=CAI Connected Maintenance Demo
```

Do not place credentials or tokens in `.env`.

For local development:

```bash
DATABASE_PATH=./data/cai-demo2.db
```

---

## 24. Model capability validation

During initial development, verify that the `gpt-5.6-terra` deployment accepts image input through the Responses API.

The build should include:

`npm run verify:ai`

The command should:

1. acquire an Entra token;
2. call the deployment with a trivial text request;
3. call the deployment with a tiny test image;
4. validate structured output capability;
5. fail with a clear diagnostic if image input is unavailable.

If `gpt-5.6-terra` does not accept `input_image`, use a vision-capable model deployment in the **same Foundry project for Call 1 only**, while retaining Terra for Call 2 if desired. Do not silently pretend Terra handled the image.

---

## 25. Image handling and storage

### V1 recommendation

**Do not create an Azure Storage Account for V1.**

Reasons:

- only small synthetic demo images are required;
- sample images can ship inside the container;
- live-uploaded images can be stored temporarily as an SQLite BLOB;
- long-term persistence is not needed;
- fewer Azure dependencies improve keynote reliability.

Container Apps local storage is ephemeral. That is acceptable because:

- the database is seeded automatically;
- the app is a demo;
- a Reset Demo function exists;
- the Container App will run one replica;
- no production records exist.

If durable image/database persistence later becomes required, add a storage account in `rgCAI`. For a persistent SQLite file, prefer an Azure Files mount rather than Blob storage.

---

## 26. Container Apps configuration

Create:

- one Azure Container Registry in `rgCAI`;
- one Container Apps Environment in `rgCAI`;
- one Container App;
- system-assigned managed identity.

Suggested names:

```text
Container Apps Environment: cae-cai-demo2
Container App:              ca-cai-demo2
Image repository:           cai-demo2
ACR:                        globally unique name such as acrcaidemo2<suffix>
```

Run:

- minimum replicas: `1`;
- maximum replicas: `1`;
- external HTTPS ingress enabled;
- target port: application port;
- CPU/memory sized conservatively for a keynote demo.

Keeping a single warm replica avoids SQLite concurrency issues and cold-start surprises.

---

## 27. Deployment workflow

Create deployment scripts:

```text
infra/
  deploy.sh
  deploy.ps1
  configure-foundry-rbac.md
  configure-entra-auth.md
```

Expected deployment order:

1. select subscription;
2. confirm `rgCAI`;
3. create ACR if absent;
4. create Container Apps Environment if absent;
5. build/push container image;
6. create/update Container App;
7. enable system-assigned managed identity;
8. assign Foundry project RBAC;
9. set non-secret environment variables;
10. set min/max replicas to 1;
11. optionally enable Container Apps Entra authentication;
12. call `/api/health`;
13. call `/api/demo/reset`;
14. display final application URL.

All scripts must be idempotent where practical.

---

## 28. Local development flow

Developer prerequisites:

- Node LTS;
- Docker Desktop;
- Azure CLI;
- access to the specified subscription and Foundry project.

Workflow:

```bash
az login
az account set --subscription <your-subscription-id>

npm install
npm run db:init
npm run db:seed
npm run verify:ai
npm run dev
```

No key configuration step is allowed.

---

## 29. Reliability features

### Required

- `Reset Demo` button;
- deterministic seed data;
- fixed keynote sample button;
- one warm Container App replica;
- AI timeout;
- server-side schema validation;
- clear error UI;
- health page;
- no external side effects;
- local fixture mode for rehearsal;
- screenshot fallback package.

### Fixture mode

`DEMO_FIXTURE_MODE=true`

When enabled:

- do not call Foundry;
- return JSON fixtures that match expected responses;
- display a clear `Fixture Mode` badge.

Fixture mode is for development/rehearsal only. It must not be presented as live AI.

### Live failure behavior

If the AI call fails during the keynote:

- do not silently substitute fixture output;
- show a concise recoverable error;
- presenter switches to prepared screenshots;
- do not debug on stage.

---

## 30. Observability

The keynote application does not need enterprise telemetry, but it must log:

- request correlation ID;
- AI call start/end;
- elapsed model call time;
- case state transitions;
- human review action;
- errors.

Log to stdout/stderr so Container Apps logs can capture it.

Do not log:

- access tokens;
- raw Entra headers;
- secrets;
- full image bytes.

Application Insights can be added later, but it is not required for V1.

---

## 31. Security rules

1. No API keys.
2. No real resident data.
3. No real vendor dispatch.
4. No external email/SMS.
5. No hidden production credentials.
6. All AI calls originate server-side.
7. Browser must never receive Foundry access tokens.
8. Validate file type and size on image upload.
9. Use a small upload limit, e.g. 8 MB.
10. Accept JPEG, PNG, and WEBP only.
11. Sanitize all text rendered back to the browser.
12. Do not let AI-generated strings drive SQL queries, role assignments, URLs, or external actions.
13. Parameterize all SQLite queries.
14. Enforce review state transitions server-side.
15. Log human overrides.

---

## 32. Accessibility and stage presentation requirements

The keynote room may be large. Design for readability:

- body text minimum ~18 px equivalent on presentation laptop;
- important values 24–32 px;
- high contrast;
- avoid dense tables;
- avoid tiny modal dialogs;
- no horizontal scrolling;
- one obvious primary action per stage;
- status chips with text, not color alone;
- keyboard-accessible buttons;
- allow browser zoom at 110–125% without breaking layout.

Use a 16:9 desktop layout as the primary design target.

---

## 33. Suggested repository structure

```text
cai-demo2/
  app/
    page.tsx
    api/
      health/route.ts
      cases/route.ts
      cases/[id]/route.ts
      cases/[id]/analyze/route.ts
      cases/[id]/review/route.ts
      cases/[id]/audit/route.ts
      demo/reset/route.ts

  components/
    DemoBanner.tsx
    IntakeCard.tsx
    AIAnalysisCard.tsx
    ConnectedContextCard.tsx
    ContextBoundaryPanel.tsx
    WorkOrderDraftCard.tsx
    HumanReviewCard.tsx
    AuditTimeline.tsx
    SystemStatus.tsx

  lib/
    ai/
      client.ts
      analyzeMaintenance.ts
      draftWorkOrder.ts
      schemas.ts
      prompts.ts
    db/
      client.ts
      schema.sql
      seed.ts
      repositories.ts
    workflow/
      states.ts
      transitions.ts
      routing.ts
    audit/
      audit.ts
    auth/
      reviewer.ts

  public/
    demo-images/
      pool-gate-broken.jpg
      irrigation-leak.jpg
      trail-light.jpg

  fixtures/
    ai-pool-gate.json
    ai-irrigation.json
    ai-trail-light.json

  data/
    .gitkeep

  infra/
    deploy.sh
    deploy.ps1
    configure-foundry-rbac.md
    configure-entra-auth.md

  tests/
    workflow.test.ts
    routing.test.ts
    ai-schema.test.ts
    api-review.test.ts

  Dockerfile
  .dockerignore
  .env.example
  README.md
  package.json
  tsconfig.json
```

---

## 34. Testing requirements

### Unit tests

Test:

- state transition rules;
- AI output schema validation;
- asset matching;
- warranty-first vendor routing;
- SLA matching;
- audit event creation;
- review override recording.

### Security/workflow tests

Explicitly verify:

- AI service cannot set state to `APPROVED`;
- `/review` rejects cases not in `AWAITING_HUMAN_REVIEW`;
- simulated dispatch cannot run before approval;
- real dispatch remains disabled even after approval;
- no API key is required;
- database queries are parameterized.

### Demo integration test

One automated/repeatable test should exercise:

```text
Reset
-> Submit primary sample
-> Analyze
-> Match PG-002
-> Retrieve warranty/history
-> Generate drafts
-> Reach human review
-> Change HIGH to URGENT
-> Approve
-> Verify audit log
-> Verify simulated dispatch
```

---

## 35. Acceptance criteria

The build is keynote-ready only when all of the following are true:

- the app deploys to Container Apps in `rgCAI`;
- Foundry inference works with Entra ID and no API key;
- the primary pool-gate image can be submitted;
- AI output is structured and schema-validated;
- observable facts and resident-reported facts are displayed separately;
- asset PG-002 is correctly matched;
- warranty, maintenance history, SLA, and vendor are shown;
- the UI visibly states that context came from association records;
- the work order and acknowledgement are clearly labeled Draft;
- the application reaches `AWAITING_HUMAN_REVIEW`;
- the presenter can change priority to URGENT;
- the change requires/captures a review note;
- the presenter can approve;
- external dispatch remains suppressed;
- the audit trail shows resident, AI, system, and human events;
- the audit trail shows the human override;
- elapsed time and override count are displayed;
- Reset Demo returns the app to a predictable baseline;
- the app survives repeated rehearsals without manual database repair;
- screenshots exist for every live-demo step.

---

## 36. GitHub Copilot implementation order

Give GitHub Copilot this specification and implement in this order:

1. scaffold Next.js/TypeScript project;
2. implement SQLite schema and seed/reset scripts;
3. implement workflow state machine and tests;
4. implement intake and progressive UI cards;
5. implement Foundry Entra-authenticated client;
6. implement structured Call 1 image analysis;
7. implement deterministic asset/SLA/vendor lookup;
8. implement structured Call 2 drafting;
9. implement human review endpoint and UI;
10. implement audit trail;
11. implement Demo Mode dispatch suppression;
12. implement health/status page;
13. implement fixture mode;
14. add Dockerfile;
15. add Azure deployment scripts;
16. enable managed identity and Foundry role assignment;
17. add optional Container Apps Entra user authentication;
18. run full integration test;
19. prepare screenshots;
20. rehearse the exact keynote flow.

Do not add scope that is not required by this specification unless it directly improves demo reliability.

---

## 37. Definition of done

The application is done when the presenter can reliably tell this story in under seven minutes:

> A resident sends a photo. AI interprets the problem. The application connects the observation to trusted association records. AI prepares the routine work. A manager changes something the AI did not know, approves the result, and the audit trail shows exactly who did what. Nothing external happens without the application allowing it, and in Demo Mode nothing is actually dispatched.

That is the product and keynote objective.
