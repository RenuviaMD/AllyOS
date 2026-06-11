import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

/** Patient portal chrome. Role gating is enforced in middleware (spec §9). */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/portal">
            <Wordmark />
          </Link>
          <span className="text-sm text-ink-muted">Patient portal</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
