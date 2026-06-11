import { Card, CardTitle } from "@/components/ui/card";
import { DbNotConfigured } from "@/components/ui/db-not-configured";
import { getServerSession } from "@/lib/auth";
import { requireRole } from "@/lib/auth/rbac";
import { withAudit } from "@/lib/audit";
import { listFlaggedCheckIns } from "@/lib/db/repositories";
import { FLAG_LABELS, type FlagRuleId } from "@/lib/checkin/flagger";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getServerSession();
  requireRole(session, "provider", "admin");

  if (!isDbConfigured()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">MD Inbox</h1>
        <DbNotConfigured feature="Flagged check-ins" />
      </div>
    );
  }

  // Reading flagged check-ins touches PHI — audit it.
  const flagged = await withAudit(
    {
      action: "read",
      resourceType: "check_in",
      actorUserId: session!.userId,
      actorRole: session!.role,
      phi: true,
    },
    () => listFlaggedCheckIns(),
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">MD Inbox</h1>
      <p className="mb-6 text-ink-muted">
        Check-ins auto-flagged for review (pain ≥7, new mass, severe abdominal pain).
      </p>
      {flagged.length === 0 ? (
        <Card>
          <CardTitle>All clear</CardTitle>
          <p className="text-sm text-ink-muted">No flagged check-ins.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {flagged.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ink-faint">
                  patient {c.patientId.slice(0, 8)} · {new Date(c.createdAt).toLocaleString()}
                </span>
                {c.painScore && <span className="text-xs text-ink-muted">pain {c.painScore}/10</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {((c.flagReasons as FlagRuleId[]) ?? []).map((r) => (
                  <span
                    key={r}
                    className="rounded bg-status-warn/15 px-2 py-0.5 text-xs text-status-warn"
                  >
                    {FLAG_LABELS[r] ?? r}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
