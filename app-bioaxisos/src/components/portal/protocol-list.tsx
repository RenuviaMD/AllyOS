"use client";

import { useState, useTransition } from "react";
import { requestRefill } from "@/app/actions/refills";
import { Card, CardTitle } from "@/components/ui/card";

export interface PortalProtocol {
  id: string;
  items: Array<{ name: string; dose: string }>;
}

export function ProtocolList({ protocols }: { protocols: PortalProtocol[] }) {
  if (protocols.length === 0) return null;
  return (
    <Card className="mb-6">
      <CardTitle>Active protocols</CardTitle>
      <div className="space-y-3">
        {protocols.map((p) => (
          <ProtocolRow key={p.id} protocol={p} />
        ))}
      </div>
    </Card>
  );
}

function ProtocolRow({ protocol }: { protocol: PortalProtocol }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function refill() {
    setStatus(null);
    startTransition(async () => {
      const res = await requestRefill(protocol.id);
      setStatus(res.ok ? "Refill requested — your provider will review it." : res.error ?? "Failed.");
    });
  }

  return (
    <div className="rounded-md border border-surface-border p-3">
      <ul className="mb-2 space-y-1 text-sm">
        {protocol.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{item.name}</span>
            <span className="text-ink-muted">{item.dose}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={refill}
        disabled={pending}
        className="inline-flex h-8 items-center justify-center rounded-md border border-surface-border px-3 text-xs font-medium hover:bg-surface-base disabled:opacity-50"
        type="button"
      >
        {pending ? "Requesting…" : "Request refill"}
      </button>
      {status && <p className="mt-2 text-xs text-ink-muted">{status}</p>}
    </div>
  );
}
