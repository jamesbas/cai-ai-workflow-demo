"use client";

import { useState } from "react";

/**
 * Renders nothing if the logo file is absent, so a missing asset can never
 * show a broken-image icon on stage.
 */
export function ChapterLogo({ className = "h-20 w-auto" }: { className?: string }) {
  const [available, setAvailable] = useState(true);
  if (!available) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/cai-chesapeake-logo.jpg"
      alt="Chesapeake Region Chapter, Community Associations Institute"
      className={className}
      onError={() => setAvailable(false)}
    />
  );
}
