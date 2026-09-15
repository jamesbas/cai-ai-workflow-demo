"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui";

interface Health {
  status: string;
  database: string;
  foundry: string;
  foundryDetail: string;
  demoMode: boolean;
  externalDispatch: boolean;
  fixtureMode: boolean;
  model: string;
  visionModel: string;
}

export function SystemStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((response) => response.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setError("Could not reach /api/health."));
  }, []);

  if (error) return <p className="text-xl text-warn">{error}</p>;
  if (!health) return <p className="text-xl text-muted">Checking…</p>;

  const rows: Array<[string, string, boolean]> = [
    ["Application", health.status, health.status === "ok"],
    ["SQLite database", health.database, health.database === "ok"],
    ["Microsoft Foundry (Entra token)", health.foundry, health.foundry === "ok"],
    ["Demo Mode", health.demoMode ? "enabled" : "disabled", health.demoMode],
    [
      "External dispatch",
      health.externalDispatch ? "ENABLED" : "suppressed",
      !health.externalDispatch,
    ],
    ["Fixture mode", health.fixtureMode ? "ON — not live AI" : "off", !health.fixtureMode],
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">System Status</h1>
      <ul className="space-y-3">
        {rows.map(([label, value, ok]) => (
          <li
            key={label}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-line bg-surface p-5"
          >
            <span className="text-xl font-semibold">{label}</span>
            <Chip tone={ok ? "ok" : "warn"}>{value}</Chip>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border-2 border-line bg-surface p-5 text-lg">
        <p>
          <span className="font-bold">Drafting model:</span> {health.model}
        </p>
        <p>
          <span className="font-bold">Vision model (AI Call 1):</span> {health.visionModel}
        </p>
        <p className="mt-2 text-muted">Foundry detail: {health.foundryDetail}</p>
        <p className="mt-2 text-muted">
          Authentication uses Microsoft Entra ID. No API key is configured or required.
        </p>
      </div>
    </div>
  );
}
