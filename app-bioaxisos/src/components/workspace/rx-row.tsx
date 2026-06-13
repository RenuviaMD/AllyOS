"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { discontinuePrescription } from "@/app/actions/prescriptions";

export interface ChartRx {
  id: string;
  items: Array<{ name: string; dose: string }>;
}

export function RxRow({ rx }: { rx: ChartRx }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function discontinue() {
    setError(null);
    startTransition(async () => {
      const res = await discontinuePrescription(rx.id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Failed");
    });
  }

  return (
    <li className="rounded-md border border-surface-border p-3">
      <ul className="mb-2 space-y-1 text-sm">
        {rx.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{item.name}</span>
            <span className="text-ink-muted">{item.dose}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={discontinue}
        disabled={pending}
        className="inline-flex h-7 items-center rounded-md border border-surface-border px-2.5 text-xs hover:bg-surface-base disabled:opacity-50"
        type="button"
      >
        {pending ? "Discontinuing…" : "Discontinue"}
      </button>
      {error && <p className="mt-1 text-xs text-status-stop">{error}</p>}
    </li>
  );
}
