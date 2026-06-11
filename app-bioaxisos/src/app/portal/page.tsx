import { CheckInForm } from "@/components/portal/check-in-form";

export const dynamic = "force-dynamic";

export default function PortalHome() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Your check-in</h1>
      <p className="mb-6 text-ink-muted">
        Tell us how you&apos;re doing. Anything concerning goes straight to your care team.
      </p>
      <CheckInForm />
    </div>
  );
}
