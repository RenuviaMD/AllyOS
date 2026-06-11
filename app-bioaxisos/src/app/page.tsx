import { Wordmark } from "@/components/brand/logo";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { loadFormulary } from "@/lib/formulary";

export const dynamic = "force-static";

const PHASE0 = [
  "Next.js + TypeScript + Tailwind scaffold",
  "Brand tokens (cyan #22D3EE, Manrope/Inter/Plex Mono, HUD grid)",
  "DigitalOcean Postgres schema (users / patients / audit_log) via Drizzle",
  "Audit-log primitive — every PHI read/write routes through withAudit()",
  "No-PHI email transport — link-only, PHI cannot enter a body by construction",
  "RBAC guards — role + row-level patient ownership",
  "Formulary importer — Zod-validated at build",
];

export default function Home() {
  const formulary = loadFormulary();
  const individuals = formulary.filter((c) => c.kind === "individual").length;
  const stacks = formulary.filter((c) => c.kind === "stack").length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 flex items-center justify-between">
        <Wordmark />
        <StatusDot status="ok" label="Phase 0 · Foundation" />
      </header>

      <h1 className="mb-2 text-2xl font-semibold">Foundation online</h1>
      <p className="mb-8 max-w-xl text-ink-muted">
        Operational shell for the RenuviaMD clinical platform. This page is the Phase 0 health
        surface; the patient portal and doctor workspace land in later phases.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Phase 0 checklist</CardTitle>
          <ul className="space-y-2 text-sm">
            {PHASE0.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-accent">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Formulary imported</CardTitle>
          <p className="font-mono text-3xl text-accent">{formulary.length}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {individuals} individual · {stacks} stack cards, schema-validated at build.
          </p>
        </Card>
      </div>
    </main>
  );
}
