# Running the AllyOS auditors yourself

Every locked clinical module passes a **3-auditor lock** before its status flips to
`locked`. This is what runs after each change. Here's how to run it without me, and
what to expect.

## The 3 auditors

| Auditor | What it checks | Can you run it alone? |
|---|---|---|
| **Schema / referential** | JSON valid, lock + sign-off status, every cross-file id resolves (gate packages, ING_* ids, family ids, GLP gates), ceilings present | **Yes — it's a script.** |
| **Clinical** | Doses/ceilings/rates faithful to source, no dropped contraindication, correct family hard-stops, no masking risk | Needs an LLM with the source files |
| **Citation / regulatory** | Citations are real + not overclaimed, advisory posture (no enforcement leakage), no efficacy/synergy claims | Needs an LLM (+ PubMed for citation spot-checks) |

## 1. Run the schema auditor — anytime, no AI

```bash
python3 scripts/audit-allyos.py          # human-readable, colored
python3 scripts/audit-allyos.py --json   # machine-readable
```

**What to expect:**
- A list of `✓` (passed), `⚠` (warnings — informational, e.g. a basic ingredient
  with no citation), and `✗` (errors — must fix).
- A footer: `N passed · N warnings · N errors`.
- `RESULT: PASS` (exit code 0) or `RESULT: FAIL` (exit code 1).
- A `✗` means something is structurally broken — a locked module with no sign-off, a
  gate package pointing at a family that doesn't exist, an id that resolves nowhere.
  Warnings never block a lock; errors do.

This is the auditor that catches the *mechanical* problems — the kind that silently
break the deterministic engine. It does **not** judge whether the medicine is right.

## 2. Run the clinical + citation auditors — needs an LLM

These two read the module against its source and judge correctness. Two ways:

**A. Re-open Claude Code (easiest).** Say:
> "Run the 3-auditor lock on `protocols/<file>.json`."

You'll get three verdicts back, each: `PASS | PASS-WITH-NOTES | FAIL` + a numbered
list of `[severity] field → fix`. I apply the load-bearing notes, then flip the
module to `locked` with the MD sign-off recorded in its `signoff_ledger`.

**B. Anthropic API (headless / scheduled).** The auditor prompts live in this repo's
git history (each lock commit). Feed the module file + its source as context to
`claude-opus-4-8` with the same three prompts. PubMed verification uses the PubMed MCP.

## What "locked" means after a pass

When all three pass (notes applied), the module's `meta` gets:
- `status: "locked"`, an `effective` date, and
- `signoff_ledger.md_signoff` (or, for iv-module, `meta.curated_by` + `revision_log`).

The schema auditor checks exactly those fields, so **`python3 scripts/audit-allyos.py`
is your fast confirmation that every module is still properly locked and wired** — run
it anytime, especially before a deploy.

## Current locked modules (as of 2026-06-29)
- `iv-module.json` v1.1 — IV/IM formulary (now includes Niagen®/NR IV, WEL-16)
- `peptide-module.json` v1.0 · `bhrt-module.json` v1.5
- `peptide-stack-families.json` v1.0 — the 9-family taxonomy
- `wellness-iv-hard-stop.json` v1.0 — shared hard-stop gate package
- `peptide-iv-support.json` v1.0 — IV↔peptide matching layer
