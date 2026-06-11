"use client";

import { useState, useTransition } from "react";
import { submitPortalCheckIn } from "@/app/actions/checkins";
import { evaluateCheckIn, FLAG_LABELS } from "@/lib/checkin/flagger";

/**
 * Patient check-in form. Shows a live flag preview (same flagger) and submits
 * through the audited submitPortalCheckIn server action, which resolves the
 * patient from the session and runs the authoritative evaluation.
 */
export function CheckInForm() {
  const [pain, setPain] = useState(3);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const preview = evaluateCheckIn({ painScore: pain, freeText: text });

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await submitPortalCheckIn({ painScore: pain, freeText: text });
      if (res.ok) {
        setText("");
        setResult({
          ok: true,
          message: res.data?.flagged
            ? "Submitted — your care team has been alerted to review this."
            : "Submitted. Thank you.",
        });
      } else {
        setResult({ ok: false, message: res.error ?? "Could not submit." });
      }
    });
  }

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
          This will be routed to your medical team for prompt review:
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
        onClick={submit}
        disabled={pending}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
        type="button"
      >
        {pending ? "Submitting…" : "Submit check-in"}
      </button>

      {result && (
        <p className={`mt-3 text-xs ${result.ok ? "text-status-ok" : "text-status-stop"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
