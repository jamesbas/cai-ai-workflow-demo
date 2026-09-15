# CAI Demo 2 — Connected Maintenance Workflow

Keynote demonstration application for the CAI Chesapeake Region Chapter 2026
keynote. A resident submits a photo and a sentence. AI interprets the
submission, the application connects that interpretation to trusted association
records, AI drafts the routine paperwork, and a human reviewer decides what
actually happens. Every step is audited.

> **AI runs the routine; humans decide what matters.**

Build specification: [CAI-Demo2-Spec.md](CAI-Demo2-Spec.md)
Live presenter script: [demo-2-flow.md](demo-2-flow.md)

---

## Guarantees this app is built to demonstrate

| Guardrail | How it is enforced |
|---|---|
| Data boundaries | The `Context Used` panel lists exactly what the model received and what it did not. |
| Human review | `APPROVED`, `REJECTED`, and `REROUTED` can only be entered by a `HUMAN_REVIEWER` actor. The model has no tool, endpoint, or prompt path to approval. |
| Escalation | Reroute and reject are first-class actions on the same screen as approve. |
| Auditability | Every resident, AI, system, and human action is written to `audit_events` with actor, timestamp, before/after, reason, and correlation ID. |
| No external side effects | `DEMO_EXTERNAL_DISPATCH=false` moves approved work to `SIMULATED_DISPATCH` and logs `EXTERNAL_DISPATCH_SUPPRESSED`. Nothing is emailed, texted, or dispatched. |
| No API keys | Foundry calls use `DefaultAzureCredential` and the `https://ai.azure.com/.default` scope. A test asserts no source file references an API key variable. |

---

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict
- Tailwind CSS 4
- SQLite via `better-sqlite3` (all queries parameterized)
- `openai` Responses API + `@azure/identity`, Microsoft Entra ID only
- Vitest
- Azure Container Apps, image built in Azure Container Registry

---

## Local development

Prerequisites: Node LTS (22+), Azure CLI. Docker is **not** required — the
deployment scripts build the image in ACR.

```powershell
az login --tenant <your-tenant-id>
az account set --subscription <your-subscription-id>

Copy-Item .env.local.example .env.local

npm install
npm run gen:images   # placeholder scenario images
npm run db:init
npm run db:seed
npm run verify:ai    # confirms Entra auth, image input, structured output
npm run dev
```

Open http://localhost:3000.

There is no key configuration step, and there must never be one.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and run |
| `npm run db:init` | Create the SQLite file and schema |
| `npm run db:seed` | Insert/refresh synthetic reference data |
| `npm run db:reset` | Delete generated cases and audit events, reseed reference data |
| `npm run gen:images` | Regenerate placeholder scenario images |
| `npm run verify:ai` | Validate the Foundry deployment end to end |
| `npm run smoke` | Run the whole keynote flow against a running server |
| `npm test` | Unit, security, and demo integration tests |
| `npm run typecheck` | `tsc --noEmit` |

---

## Demo images

`npm run gen:images` writes schematic placeholder illustrations to
`public/demo-images/`. They are good enough to rehearse the whole flow, and the
pool-gate image clearly shows an open, unlatched gate.

**Replace them with staged synthetic photos before the keynote.** Keep the same
filenames:

- `pool-gate-broken.jpg`
- `irrigation-leak.jpg`
- `trail-light.jpg`

Photos must contain no real resident, no readable licence plate, and no
personally identifying information.

---

## Workflow

```text
SUBMITTED -> AI_ANALYZED -> CONTEXT_ENRICHED -> DRAFT_READY -> AWAITING_HUMAN_REVIEW
                                                                 -> APPROVED -> SIMULATED_DISPATCH
                                                                 -> REJECTED
                                                                 -> REROUTED -> AWAITING_HUMAN_REVIEW
```

Two AI calls, never one:

1. **AI Call 1** — interprets the image and note. Returns observed facts and
   resident-reported facts separately, a category, a qualitative confidence
   label, and an urgency of `LOW`, `MEDIUM`, or `HIGH`. It cannot return
   `URGENT`; only a reviewer can.
2. **AI Call 2** — drafts the work order, resident acknowledgement, and manager
   summary *after* the application has retrieved asset, warranty, history, SLA,
   and vendor data from SQLite.

The model never queries the database and never selects the vendor. Vendor
routing is an application rule: active warranty provider, then the asset's
preferred vendor, then the approved vendor for the category.

---

## API

| Route | Purpose |
|---|---|
| `GET /api/health` | App, database, and Foundry status (cached token check, no inference) |
| `GET /api/demo/scenarios` | Seeded scenarios and residents for the intake form |
| `POST /api/cases` | Create a request (multipart: resident, location, note, image or `sampleImage`) |
| `GET /api/cases/:id` | Presentation-safe case view |
| `GET /api/cases/:id/image` | Submitted photo from the SQLite BLOB |
| `POST /api/cases/:id/analyze` | Runs both AI calls and the association lookup |
| `POST /api/cases/:id/review` | `START_REVIEW`, `APPROVE`, `REJECT`, `REROUTE` |
| `GET /api/cases/:id/audit` | Ordered audit events plus metrics |
| `POST /api/demo/reset` | Delete generated cases/events, keep seed data, verify images |

---

## Environment variables

See [.env.example](.env.example). Nothing in this list is a secret.

| Variable | Notes |
|---|---|
| `FOUNDRY_PROJECT_ENDPOINT` | Project endpoint; `/openai/v1` is appended in code |
| `FOUNDRY_MODEL` | Drafting deployment (`gpt-5.6-terra`) |
| `FOUNDRY_VISION_MODEL` | Optional. Set only if the main deployment cannot take image input |
| `AZURE_TENANT_ID` | Local development only, when the Azure CLI default tenant differs |
| `DATABASE_PATH` | `./data/cai-demo2.db` locally, `/app/data/cai-demo2.db` in the container |
| `DEMO_EXTERNAL_DISPATCH` | Must stay `false` |
| `DEMO_FIXTURE_MODE` | Rehearsal only. The UI shows a `FIXTURE MODE` banner when on |

---

## Deploy

```powershell
./infra/deploy.ps1
```

```bash
./infra/deploy.sh
```

The script is idempotent and will: select the subscription, confirm `rgCAI`,
create the ACR and Container Apps environment if absent, build the image in
ACR, create or update the Container App with a system-assigned managed
identity, grant `AcrPull` and the Foundry role, set non-secret environment
variables, pin replicas to 1, then call `/api/health` and `/api/demo/reset`.

Current deployment:

```text
https://<container-app-name>.<env-id>.<region>.azurecontainerapps.io
```

The script prints the real URL when it finishes. It is intentionally not
committed: the app has no inbound authentication by default, so anyone with the
URL can trigger live model calls against your Foundry quota. Enable
[Entra sign-in](infra/configure-entra-auth.md) before sharing it.

Notes from the first deployment:

- The Container Apps environment is in **eastus2**. `eastus` returned
  `AKSCapacityHeavyUsage`. Pass `-Location <region>` / `LOCATION=<region>` if a
  region is out of capacity; the script deletes and recreates an environment
  left in a `Failed` state.
- Foundry role assignments take a few minutes to reach the data plane. A
  `403 status code (no body)` immediately after the first deploy is propagation,
  not misconfiguration.

- [infra/configure-foundry-rbac.md](infra/configure-foundry-rbac.md)
- [infra/configure-entra-auth.md](infra/configure-entra-auth.md)

A single warm replica is intentional: it avoids SQLite concurrency issues and
cold-start surprises on stage.

### Verify a deployment

```powershell
npm run smoke                                          # local dev server
./scripts/smoke.ps1 -Base https://<app-fqdn>           # deployed app
```

The script runs reset → submit keynote sample → analyze → override to URGENT →
approve, then prints the audit trail.

---

## Reliability on stage

- `Reset Demo` in the top navigation returns the app to a deterministic baseline.
- `Use keynote sample` always loads Avery Martin, East Pool Entrance, the
  predefined note, and the pool-gate image.
- AI calls have a timeout (`DEMO_AI_TIMEOUT_MS`) and schema validation.
- If a live AI call fails, the UI shows a concise recoverable error and the case
  state is unchanged. **It never silently substitutes fixture output.**
  Switch to the prepared screenshots. Do not debug on stage.
- Store the screenshot fallback set in `screenshots/`.

---

## Data

All data is synthetic. Emails use the reserved `.invalid` TLD, phone numbers use
the fictional `555-01xx` range, and every reference table carries
`is_synthetic = 1`.

Live-uploaded images are stored as a SQLite BLOB. Container Apps storage is
ephemeral, which is fine: the database reseeds automatically on start and
`Reset Demo` restores the baseline.
