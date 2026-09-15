import type { CaseView } from "@/lib/cases/view";
import type { ActorType } from "@/lib/types";
import { Chip } from "@/components/ui";

const ACTOR_STYLE: Record<ActorType, { tone: string; icon: string; label: string }> = {
  RESIDENT: { tone: "resident", icon: "R", label: "Resident" },
  AI: { tone: "ai", icon: "AI", label: "AI" },
  SYSTEM: { tone: "system", icon: "S", label: "System" },
  HUMAN_REVIEWER: { tone: "human", icon: "H", label: "Human reviewer" },
};

function formatTime(iso: string): string {
  return `${iso.slice(11, 19)} UTC`;
}

function renderValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key}: ${typeof entry === "object" ? JSON.stringify(entry) : String(entry)}`)
      .join(" · ");
  }
  return String(value);
}

export function AuditTimeline({ view }: { view: CaseView }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-lg border-2 border-line bg-canvas p-5 lg:grid-cols-4">
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-muted">Elapsed time</p>
          <p className="text-3xl font-bold">{view.metrics.elapsedSeconds} sec</p>
        </div>
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-muted">AI calls</p>
          <p className="text-3xl font-bold">{view.metrics.aiCalls}</p>
        </div>
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-muted">Human overrides</p>
          <p className="text-3xl font-bold">{view.metrics.humanOverrides}</p>
        </div>
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-muted">Final state</p>
          <p className="text-2xl font-bold">
            {view.status === "SIMULATED_DISPATCH"
              ? "APPROVED / DEMO DISPATCH SUPPRESSED"
              : view.statusLabel}
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {view.audit.map((event) => {
          const style = ACTOR_STYLE[event.actorType] ?? ACTOR_STYLE.SYSTEM;
          const isOverride = event.action === "HUMAN_OVERRIDE_APPLIED";
          const before = renderValue(event.before);
          const after = renderValue(event.after);

          return (
            <li
              key={event.id}
              className={`flex gap-4 rounded-lg border-2 p-4 ${
                isOverride ? "border-human bg-human-soft" : "border-line bg-surface"
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold ${
                  style.tone === "ai"
                    ? "border-ai bg-ai-soft text-ai"
                    : style.tone === "system"
                      ? "border-system bg-system-soft text-system"
                      : style.tone === "human"
                        ? "border-human bg-human-soft text-human"
                        : "border-resident bg-resident-soft text-resident"
                }`}
                aria-hidden="true"
              >
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xl font-bold">{event.action.replace(/_/g, " ")}</span>
                  <Chip tone={style.tone}>{style.label}</Chip>
                  {isOverride ? <Chip tone="warn">Human override</Chip> : null}
                  <span className="text-lg text-muted">{formatTime(event.timestampUtc)}</span>
                </div>
                <p className="text-lg text-muted">{event.actorName}</p>
                {before ? (
                  <p className="text-lg">
                    <span className="font-bold">Before:</span> {before}
                  </p>
                ) : null}
                {after ? (
                  <p className="text-lg">
                    <span className="font-bold">After:</span> {after}
                  </p>
                ) : null}
                {event.reason ? <p className="mt-1 text-lg">{event.reason}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
