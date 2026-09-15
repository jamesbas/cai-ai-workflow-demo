import type { CaseView } from "@/lib/cases/view";
import { Chip, DraftBadge, Field } from "@/components/ui";

export function WorkOrderDraftCard({ view }: { view: CaseView }) {
  const draft = view.draft;
  if (!draft) return <p className="text-lg text-muted">No draft has been generated yet.</p>;

  const context = view.context;
  const priority = view.finalPriority ?? view.recommendedPriority ?? "—";
  const vendorName =
    view.approvedVendors.find(
      (vendor) => vendor.id === (view.finalVendorId ?? view.recommendedVendorId),
    )?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <DraftBadge />
        <span className="text-lg font-semibold text-muted">
          Nothing has been sent, assigned, or dispatched.
        </span>
      </div>

      <Field label="Work order title">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl font-bold">{view.workOrderTitle ?? draft.workOrderTitle}</span>
          <DraftBadge />
        </div>
      </Field>

      <div className="grid gap-6 lg:grid-cols-4">
        <Field label="Asset">
          <span className="text-2xl font-bold">{context?.asset?.id ?? "Unmatched"}</span>
        </Field>
        <Field label="Priority">
          <Chip tone={priority === "URGENT" || priority === "HIGH" ? "warn" : "brand"}>
            <span className="text-2xl">{priority}</span>
          </Chip>
        </Field>
        <Field label="Vendor">
          <span className="text-2xl font-bold">{vendorName}</span>
        </Field>
        <Field label="Target response">
          <span className="text-2xl font-bold">
            {context?.sla ? `${context.sla.ack_minutes} min ack` : "—"}
          </span>
          <p className="text-lg text-muted">
            {context?.sla ? `${context.sla.target_resolution_hours} hr target resolution` : ""}
          </p>
        </Field>
      </div>

      <div className="rounded-lg border-2 border-line bg-canvas p-5">
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold uppercase tracking-wide text-muted">
            Work order description
          </p>
          <DraftBadge />
        </div>
        <p className="mt-2 whitespace-pre-wrap text-xl">
          {view.workOrderDescription ?? draft.workOrderDescription}
        </p>
      </div>

      <div className="rounded-lg border-2 border-line bg-canvas p-5">
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold uppercase tracking-wide text-muted">
            Resident acknowledgement
          </p>
          <DraftBadge />
        </div>
        <p className="mt-2 whitespace-pre-wrap text-xl">{draft.residentAcknowledgement}</p>
        <p className="mt-3 text-lg font-semibold text-warn">Not sent. Demo Mode.</p>
      </div>

      <div className="rounded-lg border-2 border-line bg-canvas p-5">
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold uppercase tracking-wide text-muted">Manager summary</p>
          <DraftBadge />
        </div>
        <p className="mt-2 whitespace-pre-wrap text-xl">{draft.managerSummary}</p>
      </div>
    </div>
  );
}
