"use client";

import { useCallback, useState } from "react";
import { AIAnalysisCard } from "@/components/AIAnalysisCard";
import { AuditTimeline } from "@/components/AuditTimeline";
import { ConnectedContextCard } from "@/components/ConnectedContextCard";
import { HumanReviewCard } from "@/components/HumanReviewCard";
import { IntakeCard } from "@/components/IntakeCard";
import { StageCard } from "@/components/ui";
import { WorkOrderDraftCard } from "@/components/WorkOrderDraftCard";
import type { CaseView } from "@/lib/cases/view";

type SectionKey = "intake" | "analysis" | "context" | "draft" | "review" | "audit";

const ANALYZED_STATES = new Set([
  "AI_ANALYZED",
  "CONTEXT_ENRICHED",
  "DRAFT_READY",
  "AWAITING_HUMAN_REVIEW",
  "APPROVED",
  "REJECTED",
  "REROUTED",
  "SIMULATED_DISPATCH",
]);

export default function DemoWorkspace() {
  const [view, setView] = useState<CaseView | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    intake: true,
    analysis: false,
    context: false,
    draft: false,
    review: false,
    audit: false,
  });

  const toggle = (key: SectionKey) => setOpen((state) => ({ ...state, [key]: !state[key] }));

  const handleError = useCallback((message: string) => setError(message), []);

  async function loadCase(id: string) {
    const response = await fetch(`/api/cases/${id}`);
    if (!response.ok) {
      setError("Could not load the case.");
      return;
    }
    setView((await response.json()) as CaseView);
  }

  async function onCreated(id: string) {
    setError(null);
    setCaseId(id);
    await loadCase(id);
  }

  async function analyze() {
    if (!caseId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/analyze`, { method: "POST" });
      const data = (await response.json()) as CaseView | { error: string };
      if (!response.ok) {
        setError("error" in data ? data.error : "The AI analysis could not be completed.");
        return;
      }
      const next = data as CaseView;
      setView(next);
      setOpen({ intake: false, analysis: true, context: true, draft: true, review: true, audit: true });

      const started = await fetch(`/api/cases/${caseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_REVIEW" }),
      });
      if (started.ok) setView((await started.json()) as CaseView);
    } catch {
      setError("Could not reach the application server.");
    } finally {
      setAnalyzing(false);
    }
  }

  const analyzed = view !== null && ANALYZED_STATES.has(view.status);
  const hasContext = analyzed && view?.context != null;
  const hasDraft = analyzed && view?.draft != null;
  const reviewable = view !== null && view.status !== "SUBMITTED" && view.draft != null;

  return (
    <div className="space-y-5">
      {error ? (
        <div role="alert" className="rounded-lg border-2 border-warn bg-red-50 p-5">
          <p className="text-2xl font-bold text-warn">Something went wrong</p>
          <p className="mt-1 text-xl">{error}</p>
          <p className="mt-1 text-lg text-muted">
            The case state was not changed. Retry, or continue from the prepared screenshots.
          </p>
        </div>
      ) : null}

      <StageCard
        step={1}
        title="Maintenance Request"
        subtitle="What the resident submitted"
        available
        open={open.intake}
        onToggle={() => toggle("intake")}
      >
        <IntakeCard locked={caseId !== null} onCreated={(id) => void onCreated(id)} onError={handleError} />
      </StageCard>

      {view && view.status === "SUBMITTED" ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-brand bg-brand-soft p-5">
          <div className="flex-1">
            <p className="text-2xl font-bold">Request {view.id} received</p>
            <p className="text-lg text-muted">
              Nothing has been analyzed, routed, or sent. The next step is an AI interpretation of
              the photo and note.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={analyzing}
            className="rounded-lg bg-brand px-8 py-4 text-2xl font-bold text-white disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : "Analyze Request"}
          </button>
        </div>
      ) : null}

      <StageCard
        step={2}
        title="AI Analysis"
        subtitle="Observed facts kept separate from resident-reported facts"
        available={analyzed}
        open={open.analysis}
        onToggle={() => toggle("analysis")}
      >
        {view ? <AIAnalysisCard view={view} /> : null}
      </StageCard>

      <StageCard
        step={3}
        title="Connected Association Context"
        subtitle="Asset, warranty, history, SLA, and vendor routing"
        available={Boolean(hasContext)}
        open={open.context}
        onToggle={() => toggle("context")}
      >
        {view ? <ConnectedContextCard view={view} /> : null}
      </StageCard>

      <StageCard
        step={4}
        title="Draft Work Order"
        subtitle="Prepared, not sent"
        available={Boolean(hasDraft)}
        open={open.draft}
        onToggle={() => toggle("draft")}
      >
        {view ? <WorkOrderDraftCard view={view} /> : null}
      </StageCard>

      <StageCard
        step={5}
        title="Human Review"
        subtitle="Only a reviewer can approve, reroute, or reject"
        available={reviewable}
        open={open.review}
        onToggle={() => toggle("review")}
      >
        {view ? (
          <HumanReviewCard view={view} onUpdated={setView} onError={handleError} />
        ) : null}
      </StageCard>

      <StageCard
        step={6}
        title="Audit Trail"
        subtitle="Every resident, AI, system, and human action"
        available={view !== null}
        open={open.audit}
        onToggle={() => toggle("audit")}
      >
        {view ? <AuditTimeline view={view} /> : null}
      </StageCard>
    </div>
  );
}
