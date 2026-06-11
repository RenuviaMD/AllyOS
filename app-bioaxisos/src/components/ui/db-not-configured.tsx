import { Card, CardTitle } from "@/components/ui/card";

/** Shown on DB-backed views when DATABASE_URL is not yet configured. */
export function DbNotConfigured({ feature }: { feature: string }) {
  return (
    <Card>
      <CardTitle>{feature}</CardTitle>
      <p className="text-sm text-ink-muted">
        This view is wired and ready — it activates once the DigitalOcean database is connected.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-ink-faint">
        <li>
          Set <code className="mono">DATABASE_URL</code> + <code className="mono">DATABASE_CA_CERT</code>{" "}
          (Netlify env or local <code className="mono">.env.local</code>).
        </li>
        <li>
          Apply the migration: <code className="mono">pnpm db:migrate</code> (or the{" "}
          <code className="mono">db-migrate</code> GitHub Action).
        </li>
        <li>Optionally seed synthetic test data: <code className="mono">pnpm db:seed</code>.</li>
      </ol>
    </Card>
  );
}
