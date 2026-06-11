import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { loadFormulary } from "@/lib/formulary";

export const dynamic = "force-dynamic";

export default function WorkspaceDashboard() {
  const count = loadFormulary().length;
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Workspace</h1>
      <p className="mb-8 text-ink-muted">Provider operations. Phase 1 — Protocol Designer online.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/workspace/designer">
          <Card className="transition-colors hover:border-accent">
            <CardTitle>Protocol Designer</CardTitle>
            <p className="text-sm text-ink-muted">
              Build a protocol from {count} formulary cards with the compliance gate.
            </p>
          </Card>
        </Link>
        <Link href="/workspace/inbox">
          <Card className="transition-colors hover:border-accent">
            <CardTitle>MD Inbox</CardTitle>
            <p className="text-sm text-ink-muted">
              Flagged check-ins (pain ≥7, new mass, severe abdominal pain). Live once the DB is
              connected.
            </p>
          </Card>
        </Link>
        <Link href="/workspace/patients">
          <Card className="transition-colors hover:border-accent">
            <CardTitle>Patients</CardTitle>
            <p className="text-sm text-ink-muted">
              Your roster (row-level ownership). Live once the DB is connected.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
