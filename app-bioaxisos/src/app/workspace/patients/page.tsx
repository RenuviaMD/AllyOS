import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { DbNotConfigured } from "@/components/ui/db-not-configured";
import { getServerSession } from "@/lib/auth";
import { requireRole } from "@/lib/auth/rbac";
import { listPatientsForProvider } from "@/lib/db/repositories";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const session = await getServerSession();
  requireRole(session, "provider", "admin");

  if (!isDbConfigured()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Patients</h1>
        <DbNotConfigured feature="Patient roster" />
      </div>
    );
  }

  // A provider sees only their own roster (row-level ownership, spec §9).
  const roster = await listPatientsForProvider(session!.userId);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Patients</h1>
      <p className="mb-6 text-ink-muted">Charts you own.</p>
      {roster.length === 0 ? (
        <Card>
          <CardTitle>No patients yet</CardTitle>
          <p className="text-sm text-ink-muted">Seed synthetic data or add a patient to begin.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {roster.map((p) => (
            <Link key={p.id} href={`/workspace/patients/${p.id}`}>
              <Card className="transition-colors hover:border-accent">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">MRN {p.mrn}</span>
                  <span className="text-xs text-ink-faint">
                    since {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
