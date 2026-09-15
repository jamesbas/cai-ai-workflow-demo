"use client";

import { useEffect, useState } from "react";
import type { CaseView } from "@/lib/cases/view";
import { Chip } from "@/components/ui";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function HumanReviewCard({
  view,
  onUpdated,
  onError,
}: {
  view: CaseView;
  onUpdated: (next: CaseView) => void;
  onError: (message: string) => void;
}) {
  const [priority, setPriority] = useState(view.finalPriority ?? view.recommendedPriority ?? "MEDIUM");
  const [vendorId, setVendorId] = useState(view.finalVendorId ?? view.recommendedVendorId ?? "");
  const [title, setTitle] = useState(view.workOrderTitle ?? "");
  const [description, setDescription] = useState(view.workOrderDescription ?? "");
  const [note, setNote] = useState(view.reviewNote ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPriority(view.finalPriority ?? view.recommendedPriority ?? "MEDIUM");
    setVendorId(view.finalVendorId ?? view.recommendedVendorId ?? "");
    setTitle(view.workOrderTitle ?? "");
    setDescription(view.workOrderDescription ?? "");
  }, [view.id, view.finalPriority, view.recommendedPriority, view.finalVendorId, view.recommendedVendorId, view.workOrderTitle, view.workOrderDescription]);

  const decided = view.status !== "AWAITING_HUMAN_REVIEW";
  const changed =
    priority !== view.recommendedPriority ||
    vendorId !== view.recommendedVendorId ||
    title !== (view.workOrderTitle ?? "") ||
    description !== (view.workOrderDescription ?? "");

  async function act(action: "APPROVE" | "REJECT" | "REROUTE") {
    setBusy(true);
    try {
      const response = await fetch(`/api/cases/${view.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          finalPriority: priority,
          finalVendorId: vendorId || undefined,
          workOrderTitle: title || undefined,
          workOrderDescription: description || undefined,
          reviewNote: note || undefined,
        }),
      });
      const data = (await response.json()) as CaseView | { error: string };
      if (!response.ok) {
        onError("error" in data ? data.error : "The review could not be recorded.");
        return;
      }
      onUpdated(data as CaseView);
    } catch {
      onError("Could not reach the application server.");
    } finally {
      setBusy(false);
    }
  }

  if (decided) {
    return (
      <div className="space-y-4">
        {view.status === "SIMULATED_DISPATCH" || view.status === "APPROVED" ? (
          <div className="rounded-lg border-2 border-ok bg-green-50 p-6">
            <p className="text-3xl font-bold text-ok">
              Approved — external dispatch suppressed in Demo Mode
            </p>
            <p className="mt-2 text-xl">
              No vendor, email, text message, or resident system was contacted.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-warn bg-red-50 p-6">
            <p className="text-3xl font-bold text-warn">{view.statusLabel}</p>
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-base font-bold uppercase tracking-wide text-muted">Reviewer</p>
            <p className="text-xl">{view.reviewerName ?? "—"}</p>
          </div>
          <div>
            <p className="text-base font-bold uppercase tracking-wide text-muted">Final priority</p>
            <p className="text-xl font-bold">{view.finalPriority ?? "—"}</p>
          </div>
          <div>
            <p className="text-base font-bold uppercase tracking-wide text-muted">Reviewer note</p>
            <p className="text-xl">{view.reviewNote ?? "—"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone="human">Reviewer: {view.reviewerName ?? "Demo Reviewer (synthetic)"}</Chip>
        <Chip tone="ai">AI recommended {view.recommendedPriority ?? "—"}</Chip>
        {changed ? <Chip tone="warn">Unsaved human change</Chip> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="text-base font-bold uppercase tracking-wide text-muted">
            Priority (URGENT is reviewer-only)
          </span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-2xl font-bold"
          >
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-base font-bold uppercase tracking-wide text-muted">
            Approved vendor
          </span>
          <select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
          >
            <option value="">— select —</option>
            {view.approvedVendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name} ({vendor.category})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-base font-bold uppercase tracking-wide text-muted">
          Work order title
        </span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
        />
      </label>

      <label className="block">
        <span className="text-base font-bold uppercase tracking-wide text-muted">
          Work order description
        </span>
        <textarea
          value={description}
          rows={6}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
        />
      </label>

      <label className="block">
        <span className="text-base font-bold uppercase tracking-wide text-muted">
          Reviewer note {changed ? "(required — the recommendation was changed)" : ""}
        </span>
        <textarea
          value={note}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Explain any change you made to the AI recommendation."
          className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("APPROVE")}
          className="rounded-lg bg-ok px-8 py-4 text-2xl font-bold text-white disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("REROUTE")}
          className="rounded-lg border-2 border-brand px-8 py-4 text-2xl font-bold text-brand disabled:opacity-40"
        >
          Reroute
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("REJECT")}
          className="rounded-lg border-2 border-warn px-8 py-4 text-2xl font-bold text-warn disabled:opacity-40"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
