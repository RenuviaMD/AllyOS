"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPatient } from "@/app/actions/patients";
import { Card, CardTitle } from "@/components/ui/card";

export function NewPatientForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mrn, setMrn] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await createPatient({
        email: email.trim(),
        fullName: fullName.trim(),
        mrn: mrn.trim() || undefined,
      });
      if (res.ok) {
        setMsg({ ok: true, text: `Created. Patient portal login userId: ${res.data?.userId}` });
        setFullName("");
        setEmail("");
        setMrn("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Failed." });
      }
    });
  }

  const canSubmit = fullName.trim() !== "" && email.trim() !== "" && !pending;

  return (
    <Card className="mb-6">
      <CardTitle>Add patient (synthetic)</CardTitle>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={mrn}
          onChange={(e) => setMrn(e.target.value)}
          placeholder="MRN (optional)"
          className="rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        onClick={submit}
        disabled={!canSubmit}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
        type="button"
      >
        {pending ? "Creating…" : "Create patient"}
      </button>
      {msg && (
        <p className={`mt-2 break-all text-xs ${msg.ok ? "text-status-ok" : "text-status-stop"}`}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}
