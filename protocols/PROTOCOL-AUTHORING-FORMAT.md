# Adding a new IV/IM protocol to AllyOS — format + prompt

This is the repeatable recipe for adding a **new wellness IV/IM protocol** to the locked
library over time. It keeps every new protocol on the same honest, guardrailed footing as
the original 12. A protocol is only ever a candidate (`status:"draft"`, MD-signoff pending)
until Dr. Falcon signs it and the 3-auditor lock passes.

---

## 1 · The JSON shape (matches `protocols/iv-module.json` → `stacks[]`)

```jsonc
{
  "code": "IV-XX",                       // unique stack code (or WEL-/HYDR-/ADDON- family)
  "title": "Human name (Base Stack)",
  "version": "v0.1-draft",
  "type": "pre-built stack",
  "status": "draft",                     // draft | locked   (NEW protocols start draft)
  "requires_md_signoff": true,           // drop to false only after sign-off + lock
  "indication": "Wellness purpose in non-disease language.",
  "scope_limitation": "Adjunctive nutritional wellness support. Not intended to diagnose, treat, cure, prevent, reverse, or manage any disease. Adults >= 18.",
  "base": "0.9% NS 500 mL",              // base fluid + volume (250/500/1000)
  "components": [
    { "ingredient": "<MUST match an existing ingredients[].name>", "dose": "<within that ingredient's ceiling>" }
  ],
  "optional_add_ons": [
    { "ingredient": "...", "dose": "...", "note": "compatibility / routing caveat" }
  ],
  "infusion_time": "45 min",             // include rate floors where rate-sensitive (NAD+, Mg, Vit C)
  "frequency": "e.g. weekly / as clinically indicated",
  "key_gates": ["GFE Gate-0", "CARD-VC if Vit C 6.1-10 g", "any ingredient-level screen that applies"],
  "evidence_grade": "A | B | C | D",     // be honest; most wellness IV is C/D
  "citations": ["Real PubMed/DOI/FDA only — or omit. NEVER invent."],
  "in_primary_library": false            // true only for packet-origin protocols
}
```

## 2 · The non-negotiable rules (the honesty contract)

1. **Every component must already exist in `ingredients[]`.** No new ingredient is invented inside a protocol — if a protocol needs a new ingredient, add the ingredient (with ceiling + guardrail + screening contraindications) *first*.
2. **Doses stay at or under the ingredient ceiling.** If a protocol needs more, that's a provider decision, not a menu default.
3. **Honor compatibility + rate floors** from `compatibility_matrix` (glutathione = IV push only, never in a Vit C bag; calcium never in the Vit C bag; NAD+ dedicated bag, rate-floored).
4. **Wellness language only** — never disease-treatment claims. Keep `scope_limitation`.
5. **No fabricated citations or evidence grades.** Cite real sources or say "no direct trial evidence." Mark anything uncertain `VERIFY`.
6. **Ingredient-level screens auto-apply** — the protocol inherits each component's entry in `ingredient-screening-contraindications.json`; do not re-list them protocol-by-protocol.
7. **Starts as `draft`.** It appears in the menu with a DRAFT badge, cannot be the default, and the bench shows "requires MD sign-off" until signed.

## 3 · The authoring PROMPT (paste to Ally / Claude to draft one)

> Draft a new AllyOS wellness IV/IM protocol as a JSON object matching the schema in
> `protocols/PROTOCOL-AUTHORING-FORMAT.md`. Protocol goal: **<state the wellness goal>**.
> Constraints: use ONLY ingredients already in `iv-module.json → ingredients[]`; keep every
> dose at/under that ingredient's ceiling; respect `compatibility_matrix` and rate floors;
> wellness (non-disease) language only; honest `evidence_grade` (A–D) with REAL citations or
> none; set `status:"draft"`, `requires_md_signoff:true`. List `key_gates` (GFE Gate-0 plus any
> triggered, e.g. CARD-VC for Vit C 6.1–10 g). Do NOT invent ingredients, doses, or citations —
> if something isn't supported, say so and leave it out. Output the JSON only, then a short
> plain-English rationale + the evidence basis below it.

## 4 · Before a draft becomes `locked` (the promotion gate)

Run the **3-auditor lock** (same discipline used on the original module):
- **Clinical-fidelity auditor** — doses/rates/compatibility/ceilings all consistent and safe.
- **Citation + regulatory auditor** — every citation real and accurately represented; wellness scope intact; no disease claims.
- **Schema auditor** — valid JSON; ingredients resolve to `ingredients[]`; gates wired.

Then: **Dr. Falcon signs** → flip `status:"locked"`, `requires_md_signoff:false`, bump `version`,
and the DRAFT badge disappears. Record the sign-off date.

## 5 · Where it shows up automatically

Once added to `stacks[]`, a protocol appears in: the chairside **Protocol menu** (right panel),
the **📖 Reference** drawer (Protocols tab), and **Ally**'s grounding — all rendered from the same
JSON, so there is one source of truth and nothing is re-typed.
