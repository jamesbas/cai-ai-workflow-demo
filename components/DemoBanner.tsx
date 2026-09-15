import { config } from "@/lib/config";

export function DemoBanner() {
  return (
    <div className="border-b-2 border-line bg-ink px-6 py-3 text-center">
      <p className="text-xl font-bold tracking-wide text-white">
        DEMO MODE — Synthetic data. No external dispatch or communication.
      </p>
      {config.fixtureMode ? (
        <p className="mt-1 text-lg font-bold text-amber-300">
          FIXTURE MODE — Responses are pre-recorded. This is not live AI.
        </p>
      ) : null}
    </div>
  );
}
