import { CheckInForm } from "@/components/portal/check-in-form";
import { ProtocolList, type PortalProtocol } from "@/components/portal/protocol-list";
import { getServerSession } from "@/lib/auth";
import { getPatientByUserId, listActivePrescriptions } from "@/lib/db/repositories";
import { getFormularyCard } from "@/lib/formulary";
import { isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

interface RxItem {
  slug: string;
  dose: string;
}

export default async function PortalHome() {
  const session = await getServerSession();

  let protocols: PortalProtocol[] = [];
  if (isDbConfigured() && session?.role === "patient") {
    const patient = await getPatientByUserId(session.userId);
    if (patient) {
      const rx = await listActivePrescriptions(patient.id);
      protocols = rx.map((r) => ({
        id: r.id,
        items: ((r.items as RxItem[]) ?? []).map((item) => ({
          name: getFormularyCard(item.slug)?.name ?? item.slug,
          dose: item.dose,
        })),
      }));
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Your portal</h1>
      <p className="mb-6 text-ink-muted">Your active protocols and check-in.</p>

      <ProtocolList protocols={protocols} />

      <h2 className="mb-3 font-sans text-lg font-semibold">How are you doing?</h2>
      <p className="mb-4 text-sm text-ink-muted">
        Tell us how you&apos;re feeling. Anything concerning goes straight to your care team.
      </p>
      <CheckInForm />
    </div>
  );
}
