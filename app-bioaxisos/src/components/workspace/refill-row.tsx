"use client";

import { useState, useTransition } from "react";
import { decideRefill } from "@/app/actions/refills";

export interface RefillView {
  id: string;
  patientId: string;
  status: string;
  requestedAt: string;
}

export function RefillRow({ refill }: { refill: RefillView }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(refill.status);
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "approved" | "denied") {
    setError(null);
    startTransition(async () => {
      const res = await decideRefill(refill.id, decision);
      if (res.ok) setStatus(decision);
      else setError(res.error ?? "Failed");
    });
  }

  const decided = status !== "requested";

  return (
    <div className="card flex items-center justify-between p-4">
      <div>
        <span className="font-mono text-xs text-ink-faint">
          patient {refill.patientId.slice(0, 8)} · {new Date(refill.requestedAt).toLocaleString()}
        </span>
        <div className="mt-1 text-sm">
          Status: <span className={decided ? "text-ink-muted" : "text-status-warn"}>{status}</span>
        </div>
        {error && <p className="text-xs text-status-stop">{error}</p>}
      </div>
      {!decided && (
        <div className="flex gap-2">
          <button
            onClick={() => decide("approved")}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => decide("denied")}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md border border-surface-border px-3 text-xs hover:bg-surface-base disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
