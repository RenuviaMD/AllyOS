import { isBaaSigned } from "@/lib/env";

/**
 * Persistent compliance banner. Shown whenever BAA_SIGNED !== "true" so no one
 * mistakes the test environment for a production, BAA-covered system. Renders
 * nothing once a BAA is in force.
 */
export function SyntheticBanner() {
  if (isBaaSigned()) return null;
  return (
    <div className="sticky top-0 z-50 bg-status-warn/15 text-status-warn">
      <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs font-medium">
        SYNTHETIC DATA ONLY · BAA not signed — do not enter real patient information
      </p>
    </div>
  );
}
