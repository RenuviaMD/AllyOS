import { ProtocolDesigner } from "@/components/designer/protocol-designer";
import { getServerSession } from "@/lib/auth";
import { requireRole } from "@/lib/auth/rbac";
import { toCatalog } from "@/lib/formulary/catalog";
import { loadFormulary } from "@/lib/formulary";
import { listPatientsForProvider } from "@/lib/db/repositories";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DesignerPage() {
  const session = await getServerSession();
  requireRole(session, "provider", "admin");

  const catalog = toCatalog(loadFormulary());

  let patients: Array<{ id: string; mrn: string }> = [];
  if (isDbConfigured()) {
    const roster = await listPatientsForProvider(session!.userId);
    patients = roster.map((p) => ({ id: p.id, mrn: p.mrn }));
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Protocol Designer</h1>
      <p className="mb-6 text-ink-muted">
        Filter the formulary, review the card, confirm the compliance gate, prescribe.
      </p>
      <ProtocolDesigner catalog={catalog} patients={patients} />
    </div>
  );
}
