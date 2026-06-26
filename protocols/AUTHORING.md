# AllyOS authoring — one format for every new entry

The repeatable recipe for adding a new **ingredient**, **protocol**, **provider**, or **clinic**
to AllyOS. Every entry type has three things, always in this order:

1. **Elemental data** — the canonical field schema (matches what's already published).
2. **Structured build prompt** — paste to Ally/Claude with the raw facts; it emits the entry in the exact format.
3. **Destination + governance** — where the entry lands, and the sign-off that promotes it from draft → live.

The admin dashboard (`allyos/admin.html`) renders one **card per entry type** built from this file, so a
card and its destination never drift from the schema.

> **Protocols** have their own detailed recipe in
> [`PROTOCOL-AUTHORING-FORMAT.md`](PROTOCOL-AUTHORING-FORMAT.md) — this file does not repeat it; it
> covers **ingredients, providers, and clinics**, and ties all four to their destinations.

---

## 0 · The PHI boundary (decides where every entry lives)

| Data | PHI? | Lives in |
|---|---|---|
| **Ingredient** (drug/nutrient reference) | No | repo JSON now → Supabase `ingredients` later |
| **Protocol / stack** | No | repo JSON now → Supabase `protocols` later |
| **Provider** (name, credential, NPI, license, email) | **No** — professional identifiers | Supabase `providers` (new project) |
| **Clinic** (name, address, lines, MD arrangement) | No | Supabase `clinics` (new project) |
| **De-identified audit encounter** (Encounter ID, gates, risk flags) | No | on-device now → Supabase `audit_encounters` later |
| **Patient identity / chart / DOB / encounter-with-name** | **YES** | **on-device localStorage only — never Supabase, never a server** |

Rule of thumb: **if it names a patient, it never leaves the device.** Everything in this authoring
file is PHI-free, which is exactly why it is safe to put in Supabase and to surface in an admin UI.

---

## 1 · Ingredient

A new ingredient is added **before** any protocol can use it (a protocol component must resolve to an
existing ingredient — see `PROTOCOL-AUTHORING-FORMAT.md` rule 1). Adding an ingredient is **two writes**:
the ingredient record *and* its screening rules.

### 1a · Elemental data — ingredient record
*(matches `iv-module.json → ingredients[]`, enriched per the Niagen entry in `draft-additions.json`)*

```jsonc
{
  "id": "ING_<SHORTNAME>",          // unique, UPPER_SNAKE, ING_ prefix
  "name": "Human name (synonym)",   // EXACT string protocols will reference in components[].ingredient
  "status": "draft",                // draft | published | locked
  "requires_md_signoff": true,      // false only after sign-off
  "in_primary_library": false,      // true only for packet-origin ingredients
  "category": ["NAD+ / longevity"], // free tags for grouping
  "class": "What kind of molecule it is (and what it is NOT, if confusable)",
  "route": "IV in a dedicated bag | IV push | IM | added to base bag",
  "standard": "Default dose / volume (e.g. 500 mg / 500 mL NS)",
  "ceiling": "Max per session — the menu never defaults above this",
  "rate": "Rate floor if rate-sensitive (NAD+, Mg, Vit C); omit if not",
  "absolute_ci": "Hard contraindications (· separated)",
  "relative_ci": "Caution conditions (· separated)",
  "guardrail": "One honest paragraph: what AllyOS does/doesn't claim, evidence grade, sourcing-agnostic note, any VERIFY flags",
  "monograph": { "what": "Plain-English what it is", "evidence": "Honest evidence summary" },
  "evidence_grade": "A | B | C | D",   // most wellness IV is C/D — be honest
  "source": "MASTER-MENU §x  OR  the real reference",
  "citations": ["Real PubMed/DOI/FDA only — or omit. NEVER invent."]
}
```

### 1b · Elemental data — screening rules
*(matches `ingredient-screening-contraindications.json → ingredients[<ID>]`; this is what drives the
chairside bench guardrails automatically)*

```jsonc
"ING_<SHORTNAME>": {
  "name": "Same human name",
  "screen": [
    { "flag": "<condition key>", "level": "avoid | caution", "note": "Why, in one line" }
  ]
}
```
**Condition keys** (must match the GFE Section-B / patient-alert keys so the bench lights up):
`renal · hepatic · cardiac · hypertension · diabetes · asthma · cancer · pregnancy · g6pd ·
bleeding · thyroid · allergy · recent_surgery`.

### 1c · Build prompt
> Draft a new AllyOS **ingredient** as two JSON blocks matching `protocols/AUTHORING.md` §1a and §1b.
> Ingredient: **\<name + what it is>**. Give: id (`ING_…`), class (and what it's NOT if confusable),
> route, standard dose/volume, per-session ceiling, rate floor if rate-sensitive, absolute and relative
> contraindications, an honest one-paragraph guardrail with an evidence grade (A–D) and a
> sourcing-agnostic note, a short monograph, and REAL citations or none. Then the screening block:
> for each relevant condition key (renal/hepatic/cardiac/hypertension/diabetes/asthma/cancer/pregnancy/
> g6pd/bleeding/thyroid/allergy/recent_surgery) an `avoid` or `caution` rule with a one-line reason.
> Set `status:"draft"`, `requires_md_signoff:true`, `in_primary_library:false`. Do NOT invent doses,
> ceilings, or citations — if unsupported, say so and leave it out. Output the two JSON blocks, then a
> short rationale + evidence basis.

### 1d · Destination + governance
- **Now:** ingredient block → `protocols/draft-additions.json → ingredients[]`; screening block →
  `protocols/ingredient-screening-contraindications.json → ingredients`. Appears chairside with a DRAFT badge.
- **Later:** Supabase `ingredients` + `ingredient_screens` rows (see `supabase/schema.sql`).
- **Promotion:** 3-auditor lock (clinical / citation+regulatory / schema) → Dr. Falcon signs →
  `status:"published"|"locked"`, `requires_md_signoff:false`, record in `SIGNOFF-LEDGER.md`.

---

## 2 · Protocol / stack

Full recipe in **[`PROTOCOL-AUTHORING-FORMAT.md`](PROTOCOL-AUTHORING-FORMAT.md)**. In short:

- **Elemental data:** `iv-module.json → stacks[]` shape (`code, title, version, type, status,
  indication, scope_limitation, base, components[], optional_add_ons[], infusion_time, frequency,
  key_gates[], evidence_grade, citations[], in_primary_library`).
- **Build prompt:** §3 of that file.
- **Destination:** `draft-additions.json → stacks[]` now (DRAFT badge) → `iv-module.json → stacks[]`
  once locked → Supabase `protocols` later.
- **Governance:** every component must resolve to an existing ingredient; doses ≤ ceiling; respect the
  compatibility matrix + rate floors; starts `draft`; 3-auditor lock + MD sign-off to promote.

---

## 3 · Provider  *(Supabase `providers` — NOT PHI)*

The licensed clinician who performs the Good Faith Exam, treats, and signs. Name/credential/NPI/license
are **professional** identifiers, not patient PHI — safe for Supabase.

### 3a · Elemental data
```jsonc
{
  "id": "uuid",                 // Supabase-generated
  "clinic_id": "uuid",          // FK → clinics.id
  "name": "Last name (or full)",
  "credential": "MD | DO | NP | FNP | PA | RN | LPN",
  "role": "provider | nurse | admin",        // maps to allyos-auth ROLES
  "npi": "10 digits",           // required for can_sign providers
  "state_license": "license #",
  "license_state": "FL",
  "email": "work email",
  "can_sign": true,             // may sign GFE / orders / notes (false for RN/LPN)
  "md_of_record": false,        // true only if this provider is the clinic's MD of record
  "active": true
}
```

### 3b · Build prompt
> Create an AllyOS **provider** record matching `protocols/AUTHORING.md` §3a from: **\<name, credential,
> NPI, state license + state, email, which clinic>**. Set `role` from credential (MD/DO/NP/FNP/PA →
> provider; RN/LPN → nurse; office manager → admin), `can_sign` true for MD/DO/NP/FNP/PA and false for
> RN/LPN, `md_of_record` only if explicitly the clinic's MD of record, `active:true`. Leave `id`/`clinic_id`
> for Supabase. Do NOT guess an NPI or license — leave blank and flag if missing. Output JSON only.

### 3c · Destination + governance
- **Now (dev/login):** `allyos/allyos-auth.js → DEMO_USERS[]` (the local auth stand-in).
- **Target:** Supabase `providers` row in the **new, dedicated AllyOS-wellness project** (separate from the
  existing AuditPro project — see `supabase/schema.sql`), linked to a `clinics` row by `clinic_id`.
- **Governance:** a `can_sign` provider must have NPI + license on file. Real NPI/license values are
  **not** committed to the public repo — they go straight into Supabase / the private onboarding record.

---

## 4 · Clinic  *(Supabase `clinics` — NOT PHI)*

### 4a · Elemental data
*(matches the `onboard.html` form fields)*
```jsonc
{
  "id": "uuid",
  "name": "Clinic legal/DBA name",
  "city_state": "City, ST",
  "phone": "(xxx) xxx-xxxx",
  "lines": ["iv", "peptides", "bhrt"],        // which care lines they run
  "md_arrangement": "renuviamd | own",         // RenuviaMD is MD of record, or their own MD
  "md_of_record": true,                        // is RenuviaMD the MD here?
  "own_md": { "name": "", "credential": "MD|DO", "npi": "", "license": "", "email": "" }, // only if md_arrangement=own
  "record_location": "Clinic chart / HIPAA binder (PHI not held by AllyOS)",
  "status": "onboarding | active | paused"
}
```

### 4b · Build prompt
> Create an AllyOS **clinic** record matching `protocols/AUTHORING.md` §4a from: **\<clinic name, city/state,
> phone, which lines (IV/peptides/BHRT), MD arrangement>**. If RenuviaMD is the MD of record set
> `md_arrangement:"renuviamd"`, `md_of_record:true`, and omit `own_md`; if the clinic has its own MD set
> `md_arrangement:"own"`, `md_of_record:false`, and fill `own_md` (leave NPI/license blank if unknown).
> `status:"onboarding"`. Leave `id` for Supabase. Output JSON only.

### 4c · Destination + governance
- **Now:** the `onboard.html` Netlify form captures this into the private leads dashboard.
- **Target:** Supabase `clinics` row in the **new, dedicated AllyOS-wellness project**; `providers` link to
  it via `clinic_id`.
- **Governance:** `md_arrangement:"renuviamd"` requires a signed MD Services Agreement on file before
  `status` flips to `active`.

---

## 5 · The whole map (what an admin card writes where)

| Card | Build prompt | Destination now | Destination (Supabase) | PHI |
|---|---|---|---|---|
| **Ingredient** | §1c | `draft-additions.json` + screening map | `ingredients` + `ingredient_screens` | No |
| **Protocol** | PROTOCOL-AUTHORING §3 | `draft-additions.json → stacks[]` | `protocols` | No |
| **Provider** | §3b | `allyos-auth.js DEMO_USERS` | `providers` (new project) | No |
| **Clinic** | §4b | onboarding form → leads | `clinics` (new project) | No |
| **Patient / encounter** | — | **on-device localStorage** | de-identified `audit_encounters` only | **YES** |

Every non-PHI entry starts as a **draft**, is generated in canonical format from these prompts, gets
**sign-off**, then is promoted. Nothing is hand-typed twice; the schema here is the single source the
admin cards and the Supabase tables both follow.
