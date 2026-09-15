import Link from "next/link";
import { getCaseSummaries } from "@/lib/cases/view";
import { Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function CasesPage() {
  const cases = getCaseSummaries();

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Cases</h1>
      {cases.length === 0 ? (
        <p className="text-xl text-muted">
          No generated cases. <Link className="text-brand underline" href="/">Start the demo</Link>.
        </p>
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item.id} className="rounded-lg border-2 border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold">{item.id}</span>
                <Chip tone={item.status === "SIMULATED_DISPATCH" ? "ok" : "brand"}>
                  {item.statusLabel}
                </Chip>
                {item.finalPriority ? <Chip tone="human">{item.finalPriority}</Chip> : null}
              </div>
              <p className="mt-1 text-xl">{item.submittedLocation}</p>
              <p className="text-lg text-muted">
                {item.issueCategory ?? "uncategorized"} · created {item.createdAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
