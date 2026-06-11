import { Card, CardTitle } from "@/components/ui/card";
import { DbNotConfigured } from "@/components/ui/db-not-configured";
import { getServerSession } from "@/lib/auth";
import { listRecentAuditEvents } from "@/lib/db/repositories";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getServerSession();

  if (!session || session.role !== "admin") {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Audit log</h1>
        <Card>
          <CardTitle>Admins only</CardTitle>
          <p className="text-sm text-ink-muted">This view requires an admin session.</p>
        </Card>
      </div>
    );
  }

  if (!isDbConfigured()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Audit log</h1>
        <DbNotConfigured feature="Audit events" />
      </div>
    );
  }

  const events = await listRecentAuditEvents();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Audit log</h1>
      <p className="mb-6 text-ink-muted">
        Most recent access events. Records who/what/when — never PHI content.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-ink-faint">
            <tr className="border-b border-surface-border">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Actor</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Resource</th>
              <th className="py-2 pr-4">PHI</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {events.map((e) => (
              <tr key={e.id} className="border-b border-surface-border/50">
                <td className="py-1.5 pr-4 text-ink-muted">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="py-1.5 pr-4">{e.actorRole ?? "—"}</td>
                <td className="py-1.5 pr-4">{e.action}</td>
                <td className="py-1.5 pr-4">{e.resourceType}</td>
                <td className="py-1.5 pr-4">{e.phi ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
