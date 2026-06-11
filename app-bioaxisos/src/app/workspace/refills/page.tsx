import { Card, CardTitle } from "@/components/ui/card";
import { DbNotConfigured } from "@/components/ui/db-not-configured";
import { RefillRow } from "@/components/workspace/refill-row";
import { getServerSession } from "@/lib/auth";
import { requireRole } from "@/lib/auth/rbac";
import { listRefillsForProvider } from "@/lib/db/repositories";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function RefillsPage() {
  const session = await getServerSession();
  requireRole(session, "provider", "admin");

  if (!isDbConfigured()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Refill requests</h1>
        <DbNotConfigured feature="Refill queue" />
      </div>
    );
  }

  const refills = await listRefillsForProvider(session!.userId);
  const pendingCount = refills.filter((r) => r.status === "requested").length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Refill requests</h1>
      <p className="mb-6 text-ink-muted">{pendingCount} pending · {refills.length} total</p>
      {refills.length === 0 ? (
        <Card>
          <CardTitle>No refill requests</CardTitle>
          <p className="text-sm text-ink-muted">Requests from your patients appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {refills.map((r) => (
            <RefillRow
              key={r.id}
              refill={{
                id: r.id,
                patientId: r.patientId,
                status: r.status,
                requestedAt:
                  r.requestedAt instanceof Date ? r.requestedAt.toISOString() : String(r.requestedAt),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
