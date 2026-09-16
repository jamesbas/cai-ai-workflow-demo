Screenshot fallback package for the live keynote.

These are the only on-stage recovery path. If the live app fails for any
reason, switch to these immediately and narrate the same story. Never enable
fixture mode and present it as live AI.

## Capture

```powershell
npm run screenshots -- https://<your-app-fqdn>    # deployed app
npm run screenshots                               # local dev server
```

The script resets the demo, drives the full keynote flow against live AI, and
writes all nine PNGs at 1920x1080. It refuses to run against a target in
fixture mode unless you pass `--allow-fixture`.

Recapture after any UI change, and always after replacing the demo images.

## The nine shots

1. 01-intake.png ................ keynote sample loaded, DEMO MODE banner visible
2. 02-ai-analysis.png ........... observed facts and resident-reported facts side by side
3. 03-connected-context.png ..... PG-002, warranty, history, SLA, routed vendor
4. 04-context-used.png .......... the expanded Context Used panel, both lists
5. 05-draft-work-order.png ...... draft badges, title, priority, vendor, acknowledgement
6. 06-human-review.png .......... priority changed to URGENT with the reviewer note typed
7. 07-approved.png .............. "Approved - external dispatch suppressed in Demo Mode"
8. 08-audit-trail.png ........... full timeline with the human override highlighted
9. 09-metrics.png ............... elapsed time, AI calls, human overrides, final state

## Before the keynote

- Capture from the deployed app, after the real demo photos are in place.
  Screenshots of the placeholder illustrations will visibly differ from the
  live view if you fall back to them mid-demo.
- Copy the PNGs to the presentation laptop. They are gitignored, so they do not
  travel with the repository.
- Keep a copy alongside the deck.
