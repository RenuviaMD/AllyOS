"use client";

import { useState } from "react";
import { evaluateCheckIn, FLAG_LABELS } from "@/lib/checkin/flagger";

/**
 * Patient check-in form. Runs the same flagger client-side for instant feedback;
 * the authoritative evaluation + persistence happens in the submitCheckIn server
 * action (audited, DB-backed) once a patient session + database are connected.
 */
export function CheckInForm() {
  const [pain, setPain] = useState(3);
  const [text, setText] = useState("");

  const preview = evaluateCheckIn({ painScore: pain, freeText: text });

  return (
    <div className="card p-5">
      <label className="mb-1 block text-sm font-medium">Pain today: {pain}/10</label>
      <input
        type="range"
        min={0}
        max={10}
        value={pain}
        onChange={(e) => setPain(Number(e.target.value))}
        className="mb-4 w-full accent-[#22D3EE]"
      />

      <label className="mb-1 block text-sm font-medium">Anything you want your care team to know?</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="How are you feeling?"
        className="mb-4 w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm outline-none focus:border-accent"
      />

      {preview.flagged ? (
        <div className="rounded-md border border-status-warn/40 bg-status-warn/10 p-3 text-xs text-status-warn">
          This check-in would be routed to your medical team for prompt review:
          <ul className="mt-1 list-disc pl-4">
            {preview.reasons.map((r) => (
              <li key={r}>{FLAG_LABELS[r]}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-ink-faint">Routine check-in — no urgent flags.</p>
      )}

      <button
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent/90"
        type="button"
      >
        Submit check-in
      </button>
    </div>
  );
}
