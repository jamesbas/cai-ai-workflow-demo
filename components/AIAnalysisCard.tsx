import type { CaseView } from "@/lib/cases/view";
import { Chip, FactList, Field } from "@/components/ui";

const URGENCY_TONE: Record<string, string> = {
  LOW: "neutral",
  MEDIUM: "brand",
  HIGH: "warn",
  URGENT: "warn",
};

export function AIAnalysisCard({ view }: { view: CaseView }) {
  const analysis = view.analysis;
  if (!analysis) return <p className="text-lg text-muted">Analysis has not run yet.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Chip tone="ai">AI recommendation — not a decision</Chip>
        {view.fixtureMode ? <Chip tone="warn">Fixture response</Chip> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Field label="Issue type">
          <span className="text-3xl font-bold">{analysis.issueCategory.replace(/_/g, " ")}</span>
        </Field>
        <Field label="Suggested urgency">
          <Chip tone={URGENCY_TONE[analysis.suggestedUrgency] ?? "neutral"}>
            <span className="text-2xl">{analysis.suggestedUrgency}</span>
          </Chip>
        </Field>
        <Field label="Confidence">
          <Chip tone="neutral">
            <span className="text-2xl">{analysis.confidence}</span>
          </Chip>
        </Field>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border-2 border-ai bg-ai-soft p-5">
          <h3 className="text-xl font-bold uppercase tracking-wide text-ai">Observed in image</h3>
          <div className="mt-3">
            <FactList
              items={analysis.observations}
              empty="The model did not record anything it could directly observe."
            />
          </div>
        </div>
        <div className="rounded-lg border-2 border-resident bg-resident-soft p-5">
          <h3 className="text-xl font-bold uppercase tracking-wide text-resident">
            Reported by resident
          </h3>
          <div className="mt-3">
            <FactList items={analysis.residentReportedFacts} empty="No resident statements recorded." />
          </div>
        </div>
      </div>

      <Field label="Why this urgency">
        <p className="max-w-4xl">{analysis.urgencyReason}</p>
      </Field>

      <Field label="Missing information">
        <FactList items={analysis.missingInformation} empty="None reported." />
      </Field>

      <p className="text-lg font-semibold text-muted">
        Human review required: {analysis.requiresHumanReview ? "Yes" : "Yes"} — enforced by the
        workflow, not by the model.
      </p>
    </div>
  );
}
