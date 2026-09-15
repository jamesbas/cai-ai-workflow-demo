import type { CaseView } from "@/lib/cases/view";
import { Chip, Field } from "@/components/ui";
import { ContextBoundaryPanel } from "@/components/ContextBoundaryPanel";

export function ConnectedContextCard({ view }: { view: CaseView }) {
  const context = view.context;
  if (!context) return <p className="text-lg text-muted">Association context has not been retrieved yet.</p>;

  const asset = context.asset;

  return (
    <div className="space-y-6">
      <p className="text-2xl font-bold text-system">From association records — not model memory</p>

      {asset ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Field label="Matched asset">
            <span className="text-3xl font-bold">{asset.id}</span>
            <p className="text-xl">{asset.name}</p>
            <p className="text-lg text-muted">{asset.location}</p>
          </Field>
          <Field label="Warranty">
            {context.warranty.active ? (
              <>
                <Chip tone="ok">Active through {context.warranty.expiration}</Chip>
                <p className="mt-2 text-xl">{context.warranty.vendorName}</p>
              </>
            ) : (
              <Chip tone="neutral">No active warranty on file</Chip>
            )}
          </Field>
          <Field label="Routed vendor">
            <span className="text-2xl font-bold">{context.recommendedVendorName ?? "None"}</span>
            <p className="text-lg text-muted">{context.routingReason}</p>
          </Field>
        </div>
      ) : (
        <Chip tone="warn">No asset matched — reviewer must identify the asset</Chip>
      )}

      <div>
        <p className="text-base font-bold uppercase tracking-wide text-muted">
          Recent maintenance history
        </p>
        <ul className="mt-2 space-y-2">
          {context.maintenanceHistory.length === 0 ? (
            <li className="text-lg text-muted">No prior records on file.</li>
          ) : (
            context.maintenanceHistory.map((record) => (
              <li key={record.id} className="rounded-lg border-2 border-line bg-canvas px-4 py-3">
                <span className="text-xl font-bold">{record.work_date}</span>
                <span className="ml-3 text-xl">{record.summary}</span>
                <span className="ml-3 text-lg text-muted">
                  {record.vendor_name ?? "vendor unrecorded"} · {record.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      {context.sla ? (
        <Field label="Applicable SLA">
          <p className="text-xl">
            <span className="font-bold">{context.sla.id}</span> — acknowledge within{" "}
            {context.sla.ack_minutes} minutes, target resolution{" "}
            {context.sla.target_resolution_hours} hours (default priority{" "}
            {context.sla.default_priority}).
          </p>
          {context.sla.description ? (
            <p className="text-lg text-muted">{context.sla.description}</p>
          ) : null}
        </Field>
      ) : null}

      <ContextBoundaryPanel context={context} />
    </div>
  );
}
