import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { RxRow } from "@/components/workspace/rx-row";
import { getServerSession } from "@/lib/auth";
import { canAccessPatient, requireRole } from "@/lib/auth/rbac";
import { withAudit } from "@/lib/audit";
import {
  getPatientById,
  listActivePrescriptions,
  listCheckInsForPatient,
} from "@/lib/db/repositories";
import { FLAG_LABELS, type FlagRuleId } from "@/lib/checkin/flagger";
import { getFormularyCard } from "@/lib/formulary";

export const dynamic = "force-dynamic";

interface RxItem {
  slug: string;
  dose: string;
}

export default async function PatientChart({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  requireRole(session, "provider", "admin");

  const patient = await getPatientById(params.id);
  if (!patient || !canAccessPatient(session!, patient)) {
    return (
      <div>
        <Link href="/workspace/patients" className="text-xs text-accent">
          ← Patients
        </Link>
        <Card className="mt-4">
          <CardTitle>Not available</CardTitle>
          <p className="text-sm text-ink-muted">
            This chart does not exist or is not in your panel.
          </p>
        </Card>
      </div>
    );
  }

  // Opening a chart reads PHI — audit it.
  const { prescriptions, checkIns } = await withAudit(
    {
      action: "read",
      resourceType: "patient_chart",
      resourceId: patient.id,
      patientId: patient.id,
      actorUserId: session!.userId,
      actorRole: session!.role,
      phi: true,
    },
    async () => ({
      prescriptions: await listActivePrescriptions(patient.id),
      checkIns: await listCheckInsForPatient(patient.id),
    }),
  );

  return (
    <div>
      <Link href="/workspace/patients" className="text-xs text-accent">
        ← Patients
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">MRN {patient.mrn}</h1>
      <p className="mb-6 text-ink-muted">
        Chart opened {new Date().toLocaleString()} · access recorded in the audit log.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Active protocols</CardTitle>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-ink-muted">None active.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {prescriptions.map((p) => (
                <RxRow
                  key={p.id}
                  rx={{
                    id: p.id,
                    items: ((p.items as RxItem[]) ?? []).map((item) => ({
                      name: getFormularyCard(item.slug)?.name ?? item.slug,
                      dose: item.dose,
                    })),
                  }}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Check-in timeline</CardTitle>
          {checkIns.length === 0 ? (
            <p className="text-sm text-ink-muted">No check-ins yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {checkIns.map((c) => (
                <li key={c.id} className="border-b border-surface-border/50 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-ink-faint">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                    {c.painScore && <span className="text-xs text-ink-muted">pain {c.painScore}/10</span>}
                  </div>
                  {c.freeText && <p className="mt-1 text-xs text-ink">{c.freeText}</p>}
                  {c.severity === "flagged" && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {((c.flagReasons as FlagRuleId[]) ?? []).map((r) => (
                        <span
                          key={r}
                          className="rounded bg-status-warn/15 px-1.5 py-0.5 text-[10px] text-status-warn"
                        >
                          {FLAG_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
