import type { ReactNode } from "react";

export function StageCard({
  step,
  title,
  subtitle,
  available,
  open,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  available: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border-2 bg-surface ${
        available ? "border-line" : "border-line/60 opacity-60"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!available}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-6 py-4 text-left disabled:cursor-not-allowed"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-bold ${
            available ? "bg-brand text-white" : "bg-line text-muted"
          }`}
        >
          {step}
        </span>
        <span className="flex-1">
          <span className="block text-2xl font-bold">{title}</span>
          {subtitle ? <span className="block text-base text-muted">{subtitle}</span> : null}
        </span>
        <span className="text-base font-semibold text-muted">
          {available ? (open ? "Hide" : "Show") : "Not available yet"}
        </span>
      </button>
      {open && available ? <div className="border-t-2 border-line px-6 py-5">{children}</div> : null}
    </section>
  );
}

const CHIP_TONES: Record<string, string> = {
  neutral: "bg-canvas text-ink border-line",
  brand: "bg-brand-soft text-brand border-brand",
  ai: "bg-ai-soft text-ai border-ai",
  system: "bg-system-soft text-system border-system",
  human: "bg-human-soft text-human border-human",
  resident: "bg-resident-soft text-resident border-resident",
  warn: "bg-red-50 text-warn border-warn",
  ok: "bg-green-50 text-ok border-ok",
};

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_TONES | string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 px-3 py-1 text-base font-bold ${
        CHIP_TONES[tone] ?? CHIP_TONES.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function DraftBadge() {
  return <Chip tone="warn">Draft</Chip>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-base font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 text-xl">{children}</div>
    </div>
  );
}

export function FactList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-lg text-muted">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-6 text-xl">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
