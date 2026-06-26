# AllyOS — what we are, and what we are not

The single positioning that governs every line (IV, Peptides, BHRT, and beyond).

## What AllyOS is
- **Part of a wellness clinic's SOP.** We provide the **structure** — protocols, guardrails,
  documentation scaffolding, decision-support — that a clinic runs its practice on.
- **Decision-support only.** Ally is a **decision-maker *support***. It informs *how* and *what*;
  it surfaces evidence, contraindications, gates, and emergencies.
- **A support vendor.** We sell structure and oversight tooling, not treatment.

## Where responsibility sits — ALWAYS the clinic
- **The treating provider and the clinic's own Medical Director carry ALL clinical responsibility.**
  Every exam, order, dose, and signature is theirs. AllyOS never prescribes and never owns a clinical decision.
- **RenuviaMD / Dr. Falcon may or may not be the Medical Director** of a given clinic. We are the MD of
  record **only** for clinics that contract us for it. For everyone else it's their own physician —
  and AllyOS stays advisory there.
- **PHI is the clinic's responsibility** — the clinic treats patients and **stores the PHI**. AllyOS holds
  no PHI: patient data lives on-device / in the clinic's own systems, never on our servers.

## Two sign-offs, never confused (see SIGNOFF-LEDGER.md)
- **Publish** = RenuviaMD curator editorial review ("this reference is accurate"). Not a prescription.
- **Adopt & prescribe** = the clinic's own physician signs the GFE / standing order for their patients.
- **Enforce** (hard stops) = only where RenuviaMD is the contracted Medical Director of record.

## Practical guardrails this implies in the product
- Advisory by default; gates enforce only in MD-of-record mode.
- PHI-free architecture (on-device; nothing sent to our servers but de-identified clinical builds).
- Never broker or sell drugs; sourcing is the clinic's decision (pharmacy-agnostic).
- Honest CDS: evidence grades, named failures, no fabricated doses or citations, "VERIFY" when unsure.
- Always defer the final clinical decision and signature to the treating provider.

## Roadmap (lines of care)
1. **IV / IM Wellness** — current focus; polishing (chairside, GFE, monitoring, reference, Ally).
2. **Peptides** — polish next.
3. **BHRT (men & women)** — build later.

_This file is the north star. Any feature that blurs the line between "we support" and "we treat/regulate"
is wrong by default._
