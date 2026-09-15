"use client";

import type { AssociationContext } from "@/lib/types";

export function ContextBoundaryPanel({ context }: { context: AssociationContext }) {
  return (
    <details className="rounded-lg border-2 border-line bg-canvas">
      <summary className="cursor-pointer px-5 py-4 text-xl font-bold">Context Used</summary>
      <div className="grid gap-6 border-t-2 border-line px-5 py-5 lg:grid-cols-2">
        <div>
          <h4 className="text-lg font-bold uppercase tracking-wide text-ok">
            AI was allowed to use
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
            {context.contextUsed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold uppercase tracking-wide text-warn">
            AI was not allowed to use
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
            {context.contextExcluded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
