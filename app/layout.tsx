import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
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
      <body>
        <header className="border-b-2 border-line bg-surface">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-2xl font-bold text-brand">{config.appTitle}</p>
              <p className="text-base text-muted">Chesapeake Oaks Community Association — synthetic demonstration</p>
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
        <main className="mx-auto max-w-[1500px] px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
