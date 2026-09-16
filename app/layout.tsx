import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { ChapterLogo } from "@/components/ChapterLogo";
import { DemoBanner } from "@/components/DemoBanner";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import "./globals.css";

export const metadata: Metadata = {
  title: config.appTitle,
  description: "CAI keynote demonstration — connected maintenance workflow with a human gate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b-4 border-accent bg-surface">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-6 px-6 py-4">
            <div className="flex items-center gap-5">
              <ChapterLogo />
              <div className="border-l-2 border-line pl-5">
                <p className="text-2xl font-bold text-brand">{config.appTitle}</p>
                <p className="text-base text-muted">
                  Chesapeake Oaks Community Association — synthetic demonstration
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-2 text-lg font-semibold">
              <Link className="rounded-md px-4 py-2 text-brand hover:bg-brand-soft" href="/">
                Demo
              </Link>
              <Link className="rounded-md px-4 py-2 text-brand hover:bg-brand-soft" href="/cases">
                Cases
              </Link>
              <ResetDemoButton />
              <Link className="rounded-md px-4 py-2 text-brand hover:bg-brand-soft" href="/status">
                System Status
              </Link>
            </nav>
          </div>
        </header>
        <DemoBanner />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-6 py-6">{children}</main>
        <footer className="mt-6 border-t-2 border-line bg-surface">
          <div className="mx-auto max-w-[1500px] px-6 py-4 text-base text-muted">
            <p className="font-semibold text-ink">
              Chesapeake Region Chapter, Community Associations Institute
            </p>
            <p>
              Supporting Boards, Community Managers, &amp; Businesses Serving HOAs, Condos, &amp;
              Co-ops
            </p>
            <p className="mt-1">
              Independent keynote demonstration. Every community, resident, vendor, asset, and
              maintenance record shown here is synthetic.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
