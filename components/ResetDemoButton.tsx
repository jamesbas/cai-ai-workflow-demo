"use client";

import { useState } from "react";

export function ResetDemoButton() {
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!window.confirm("Reset the demo? Generated cases and audit events will be deleted.")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) {
        window.alert("Reset failed. Check /status.");
        return;
      }
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void reset()}
      disabled={busy}
      className="rounded-md border-2 border-brand px-4 py-2 text-lg font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
    >
      {busy ? "Resetting…" : "Reset Demo"}
    </button>
  );
}
