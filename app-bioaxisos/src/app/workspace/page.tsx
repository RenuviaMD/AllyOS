import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth";
import { requireRole } from "@/lib/auth/rbac";
import {
  listFlaggedCheckIns,
  listFlaggedCheckInsForProvider,
  listPatientsForProvider,
  listRefillsForProvider,
} from "@/lib/db/repositories";
import { loadFormulary } from "@/lib/formulary";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function WorkspaceDashboard() {
  const session = await getServerSession();
  requireRole(session, "provider", "admin");
  const formularyCount = loadFormulary().length;

  let flaggedCount: number | null = null;
  let pendingRefills: number | null = null;
  let patientCount: number | null = null;

  if (isDbConfigured()) {
    const [flagged, refills, patients] = await Promise.all([
      session!.role === "admin"
        ? listFlaggedCheckIns()
        : listFlaggedCheckInsForProvider(session!.userId),
      listRefillsForProvider(session!.userId),
      listPatientsForProvider(session!.userId),
    ]);
    flaggedCount = flagged.length;
    pendingRefills = refills.filter((r) => r.status === "requested").length;
    patientCount = patients.length;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Workspace</h1>
      <p className="mb-8 text-ink-muted">Provider operations command center.</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Patients" value={patientCount} href="/workspace/patients" />
        <Stat
          label="Flagged check-ins"
          value={flaggedCount}
          href="/workspace/inbox"
          alert={(flaggedCount ?? 0) > 0}
        />
        <Stat
          label="Pending refills"
          value={pendingRefills}
          href="/workspace/refills"
          alert={(pendingRefills ?? 0) > 0}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/workspace/designer">
          <Card className="transition-colors hover:border-accent">
            <CardTitle>Protocol Designer</CardTitle>
            <p className="text-sm text-ink-muted">
              Build a protocol from {formularyCount} formulary cards with the compliance gate.
            </p>
          </Card>
        </Link>
        <Link href="/workspace/patients">
          <Card className="transition-colors hover:border-accent">
            <CardTitle>Patients</CardTitle>
            <p className="text-sm text-ink-muted">Your roster + charts (row-level ownership).</p>
          </Card>
        </Link>
        <Link href="/workspace/audit">
          <Card className="transition-colors hover:border-accent">
            <CardTitle>Audit log</CardTitle>
            <p className="text-sm text-ink-muted">Every PHI access, recorded (admin).</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  alert = false,
}: {
  label: string;
  value: number | null;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-accent">
        <p className="text-xs uppercase tracking-wider text-ink-muted">{label}</p>
        <p className={`mt-1 font-mono text-3xl ${alert ? "text-status-warn" : "text-accent"}`}>
          {value ?? "—"}
        </p>
      </Card>
    </Link>
  );
}
