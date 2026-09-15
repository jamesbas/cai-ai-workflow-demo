# CAI Demo 2 — Live Demonstration Flow

**File:** `demo-2-flow.md`  
**Demo:** Connected maintenance workflow with a human gate  
**Target duration:** 6.5–7 minutes live; 8 minutes maximum  
**Keynote slide:** Demo 2 — A connected workflow, with a human gate  
**Demo environment:** Synthetic data only; no real resident, property, vendor, email, or dispatch

---

## 1. What this demo must prove

The audience should leave the demo understanding four things:

1. AI can interpret a real-world maintenance request that includes a photo.
2. The valuable step is not simply image recognition; it is connecting the AI result to trusted association records.
3. AI can prepare routine operational work without being allowed to make the final human decision.
4. The application can show exactly what data was used, who changed the recommendation, who approved it, and what happened next.

The demo should reinforce:

> **AI runs the routine; humans decide what matters.**

---

## 2. Pre-demo preparation

Complete these steps before the keynote session begins.

### Application

- Open the deployed Container App in the presentation browser.
- Sign in with Microsoft Entra ID if user-facing Container Apps authentication is enabled.
- Confirm the **DEMO MODE** banner is visible.
- Click **Reset Demo**.
- Confirm there are no leftover generated cases.
- Confirm `/api/health` reports:
  - app OK;
  - SQLite OK;
  - Foundry OK;
  - Demo Mode true.
- Confirm the app shows the primary `Use keynote sample` button.
- Confirm browser zoom and screen resolution are readable from the back of the room.
- Close browser tabs, notifications, email, Teams popups, and developer tools.

### Foundry

- Verify the Container App managed identity can call the Foundry project.
- Run one warm-up inference before the audience arrives.
- Do not change model deployments immediately before the session.

### Backup

Have ready:

- screenshots for every demo step;
- optional recorded walkthrough;
- the violation-workflow recording for Q&A only;
- the primary pool-gate image locally on the presentation laptop.

Do not debug on stage. If the live application fails, move immediately to screenshots.

---

## 3. Primary synthetic scenario

### Community

**Chesapeake Oaks Community Association**

### Resident

**Avery Martin**

### Location

**East Pool Entrance**

### Resident note

> The east pool gate won't latch and keeps swinging open. I tried closing it twice.

### Image

`pool-gate-broken.jpg`

### Known association record

**Asset PG-002 — East Pool Entry Gate**

Expected connected information:

- active asset;
- prior latch adjustment on August 12, 2026;
- prior hinge/latch service on May 3, 2026;
- warranty through May 31, 2027;
- warranty provider: SecureGate Systems;
- access-control maintenance SLA: 15-minute acknowledgement / four-hour target.

---

# 4. Lead-in from the keynote

This demo follows the Act III "Trust by design" slide.

Before switching to the application, land the four guardrails:

- Data boundaries
- Human review
- Escalation paths
- Auditability

Then use this transition:

> "Those sound like governance principles on a slide. Let me show you what they look like when they're built into the workflow instead of bolted on afterward."

Switch to the demo application.

Then say:

> "In Act II I showed you an assistant that knows your documents. This is different. This is AI inside an operational workflow — connected to association data, with a person still in the gate."

Do not spend time explaining the technology stack yet. Lead with the business scenario.

---

# 5. Step-by-step live demo

## Step 1 — Resident intake

**Target time:** 0:00–0:45

### On screen

Start on the **Maintenance Request** card.

Click:

**Use keynote sample**

The form should populate:

- Avery Martin;
- East Pool Entrance;
- pool-gate image;
- resident note.

### Say

> "This is how residents already report problems: a picture and a sentence."

Then briefly read or paraphrase the note:

> "The east pool gate won't latch and keeps swinging open."

### Point to

- photo;
- location;
- resident note;
- DEMO MODE banner.

### Message to land

There is nothing exotic about the input. AI is meeting an existing resident behavior rather than requiring a new process.

### Action

Click:

**Analyze Request**

---

## Step 2 — AI interprets the photo and note

**Target time:** 0:45–1:45

The **AI Analysis** card opens.

Expected result:

- issue category: pool gate/latch;
- suggested urgency: HIGH;
- confidence: HIGH or MEDIUM;
- concise reason.

### First point to make

Point to:

**Observed in image**

Example:

> Gate is visible in an open or unsecured position.

Then point to:

**Reported by resident**

Example:

> Resident says the gate will not latch and swings back open.

### Say

> "Notice something important here. The model is separating what it can actually see from what the resident told us. It isn't allowed to turn a report into a visual fact."

Then point to the urgency explanation.

### Say

> "It's suggesting that this is high priority, and it's telling the manager why. That explanation is something a person can evaluate."

### Message to land

AI interpretation is useful, but it remains a recommendation. It has not opened a work order, selected a vendor, or dispatched anyone.

---

## Step 3 — Reveal the connected association context

**Target time:** 1:45–3:00

Scroll/reveal the **Connected Association Context** card.

Expected data:

- Asset `PG-002`
- East Pool Entry Gate
- maintenance history;
- warranty status;
- warranty vendor;
- SLA;
- approved vendor route.

### Slow down here

This is the most important part of the demo.

### Say

> "This is the real shift."

Point to the matched asset.

> "The image gave us a problem. Now the application connected that problem to the actual asset."

Point to prior maintenance.

> "It knows this latch was adjusted last month."

Point to warranty.

> "It knows the gate is still under warranty."

Point to vendor.

> "And it knows who the warranty provider is."

Then land this exact message:

> **"That did not come from the model's memory. It came from the association's records. This is the connected part."**

### Message to land

The keynote is not about a smarter chatbot. The value comes from connecting AI to trusted systems and data.

---

## Step 4 — Show the data boundary

**Target time:** 3:00–3:30

Open:

**Context Used**

Show the two lists.

### Say

> "And because this is governed, I can tell you exactly what the AI was allowed to see."

Briefly point to:

**Allowed**

- this photo;
- this note;
- this asset;
- maintenance history;
- warranty;
- SLA;
- vendor-routing data.

Then point to:

**Not allowed**

- financial records;
- legal correspondence;
- executive-session material;
- unrelated residents.

### Say

> "It doesn't get every piece of data just because the association has it."

### Message to land

This makes **Data Boundaries** from the prior slide concrete.

Close the panel.

---

## Step 5 — Show the work AI prepared

**Target time:** 3:30–4:15

Reveal the **Draft Work Order** card.

Point to:

- title;
- asset;
- suggested priority;
- warranty vendor;
- work-order description;
- resident acknowledgement.

### Say

> "The routine work is now prepared."

Then emphasize the labels:

> "But notice these words: Draft. Draft. Nothing has gone anywhere."

If useful, point to the resident acknowledgement.

> "It has even prepared the acknowledgement back to the resident, but it hasn't sent it."

### Message to land

AI can eliminate mechanical drafting while the application retains authority over execution.

---

## Step 6 — Human review and deliberate override

**Target time:** 4:15–5:20

Move to **Human Review**.

Do not immediately click Approve.

### Say

> "This is the part I care about most."

Point to:

- Approve
- Reroute
- Reject
- editable fields

### Say

> "This reviewer isn't here to rubber-stamp the model. The reviewer has actual authority to change it."

The AI should have recommended:

`HIGH`

Change priority to:

`URGENT`

Enter this manager note:

> Youth swim program begins shortly; gate must be secured before pool opening.

### Say

> "Here's something the model didn't know. We have a youth swim program starting shortly. I'm changing the priority."

Pause for a second.

> "That is what meaningful human review looks like. I can override the recommendation because I have context and authority the model does not."

### If the model did not return HIGH

Still make one visible human change.

Fallback human edits:

- add `Call onsite manager before arrival` to the work order;
- change the manager note;
- change priority;
- reroute the vendor if appropriate.

The purpose is to ensure the audit trail contains at least one human modification.

---

## Step 7 — Approve, but do not really dispatch

**Target time:** 5:20–5:45

Click:

**Approve**

The UI must show:

> **APPROVED — External dispatch suppressed in Demo Mode**

### Say

> "I've approved it. In a real connected system, this is the point where the permitted downstream action could occur."

Then point to the demo banner/message.

> "For today, external dispatch is disabled. No vendor was contacted and no resident message was sent."

### Message to land

The human gate is real, but the keynote environment has no external side effects.

If asked later whether the AI can bypass approval:

> "No. Approval is enforced by the application workflow, not by a sentence in the prompt."

---

## Step 8 — Open the audit trail

**Target time:** 5:45–6:30

Open/reveal **Audit Trail**.

Let the audience visually scan it.

Expected sequence:

- resident submitted;
- AI analyzed;
- system matched PG-002;
- system retrieved warranty/history;
- system applied SLA;
- AI drafted;
- human review started;
- priority changed;
- human approved;
- external dispatch suppressed.

### Point to actor labels

Show that events distinguish:

- Resident;
- AI;
- System;
- Human Reviewer.

### Say

> "When a board member later asks, 'Why did we treat this as urgent?' or 'Why did we route it this way?', this is the answer."

Point specifically to the human override.

> "You can see what the AI suggested, what I changed, and why I changed it."

### Point to metrics

Example:

- elapsed time;
- AI calls;
- human overrides;
- final state.

### Say

> "And these little numbers matter. If this were a 60-day pilot, I would measure them. How much time did we save? How often did people override the model? Why? That's how you decide whether to scale — not because a demo looked impressive."

This tees up the later pilot-measurement slide.

---

# 6. Close the demo by mapping back to the four guardrails

**Target time:** 6:30–7:00

Do not end on the audit screen without summarizing what the audience saw.

### Say

> "Go back to the four guardrails we just talked about."

Then map them verbally:

**Data boundaries**

> "You saw exactly what the AI could and could not access."

**Human review**

> "You saw a manager change the recommendation and approve it."

**Escalation**

> "The same screen lets me reroute or reject instead of approving."

**Auditability**

> "And every step is now reviewable."

Then deliver the closing line:

> "That's not AI replacing the community manager. It's AI removing the mechanical work around the manager while leaving accountability exactly where it belongs."

Switch back to PowerPoint.

---

# 7. Transition back to the keynote

The next slide is the AI Use Policy slide.

Use:

> "Technology can enforce some of those boundaries, but an association still needs to decide what its boundaries actually are. That is why the next step is to put the rules in writing."

Advance to:

**Put it in writing: an AI Use Policy**

This creates a clean connection from the technical demonstration to governance.

---

# 8. What not to do during the live demo

Do not:

- explain SDKs, APIs, tokens, containers, or database code during the main flow;
- open Azure Portal unless a technical Q&A requires it;
- show source code during the keynote;
- claim the image alone proved the latch was broken;
- call the model's recommendation a "decision";
- imply the model independently knew the warranty or service history;
- pretend that a fixture response is live AI;
- trigger any real external message;
- improvise a second live scenario unless specifically asked in Q&A;
- troubleshoot on stage.

The audience should see a business workflow, not a developer demo.

---

# 9. Recommended Q&A answers about the demo

## "Was that really live AI?"

Answer:

> "Yes. The image interpretation and drafting were live model calls. Asset history, warranty, SLA, and vendor routing came from the application's synthetic database."

If using screenshots because of a failure, say so plainly.

## "Could the AI have approved the work order?"

Answer:

> "No. The model has no approval capability. The workflow only allows an authenticated reviewer to move the case from awaiting review to approved."

## "Why SQLite?"

Answer:

> "Because this is a keynote demo, not the production architecture. The point is the workflow pattern. In a production system that record would typically come from the management or work-order platform."

## "Why not use an agent?"

Answer:

> "This workflow doesn't need one. It's deliberately guided and deterministic. I'd introduce an agent only where dynamic tool selection or multi-step coordination actually creates value."

## "What data was sent to the model?"

Answer:

> "The app shows that directly in the Context Used panel. We restricted it to the photo, request, matched asset context, relevant maintenance data, warranty, SLA, and routing data."

## "Could this same pattern work for violations?"

Answer:

> "Yes, but the consequence is higher. In enforcement I would keep an even stronger human gate before anything is sent. I have that workflow as a separate example if it's useful."

Use the violation recording only if the question makes it relevant.

---

# 10. Failure and recovery plan

## If image upload fails

Use the built-in:

**Use keynote sample**

If already using it, switch to screenshots.

## If Foundry inference times out

Do not wait repeatedly.

Say:

> "This is why every live demo needs a backup."

Switch to the screenshot sequence and continue the same narrative.

Do not silently turn on fixture mode.

## If connected data fails

Use prepared screenshots showing:

- PG-002;
- maintenance history;
- warranty;
- vendor;
- SLA.

## If approval fails

Do not debug.

Move to the audit screenshot that shows the expected approved state.

## If the whole web application is unreachable

Stay in PowerPoint and narrate from the screenshot backup.

The keynote point matters more than proving that a cloud endpoint is reachable from a conference venue.

---

# 11. Rehearsal checklist

Run the complete demo at least several times from a clean reset.

Confirm:

- `Use keynote sample` always loads the right case;
- AI normally identifies the pool-gate scenario correctly;
- observed and reported facts remain separate;
- PG-002 always matches;
- warranty is active;
- SecureGate Systems appears;
- SLA appears;
- draft work order appears;
- human review can change HIGH to URGENT;
- review note is recorded;
- approval succeeds;
- dispatch is suppressed;
- audit trail contains the human override;
- Reset Demo clears generated state;
- browser layout survives 110–125% zoom;
- screenshot fallback is current.

Time every rehearsal.

Target:

**6:30–7:00**

Hard stop:

**8:00**

---

# 12. Final presenter memory aid

If you remember only the sequence, remember this:

**PHOTO**  
"What happened?"

**AI**  
"What does the model observe and recommend?"

**CONNECTED DATA**  
"What does the association actually know?"

**DRAFT**  
"What routine work can AI prepare?"

**HUMAN**  
"What does the manager change and decide?"

**LOG**  
"Can we explain exactly what happened later?"

That is the entire demo story.
