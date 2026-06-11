import { ProtocolDesigner } from "@/components/designer/protocol-designer";
import { toCatalog } from "@/lib/formulary/catalog";
import { loadFormulary } from "@/lib/formulary";

export const dynamic = "force-dynamic";

export default function DesignerPage() {
  const catalog = toCatalog(loadFormulary());
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Protocol Designer</h1>
      <p className="mb-6 text-ink-muted">
        Filter the formulary, review the card, confirm the compliance gate, prescribe.
      </p>
      <ProtocolDesigner catalog={catalog} />
    </div>
  );
}
