import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

/** Doctor workspace chrome. Role gating is enforced in middleware (spec §9). */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/workspace">
            <Wordmark />
          </Link>
          <nav className="flex gap-4 text-sm text-ink-muted">
            <Link href="/workspace" className="hover:text-ink">
              Dashboard
            </Link>
            <Link href="/workspace/designer" className="hover:text-ink">
              Designer
            </Link>
            <Link href="/workspace/inbox" className="hover:text-ink">
              MD Inbox
            </Link>
            <Link href="/workspace/patients" className="hover:text-ink">
              Patients
            </Link>
            <Link href="/workspace/audit" className="hover:text-ink">
              Audit
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
