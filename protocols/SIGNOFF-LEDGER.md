# AllyOS sign-off — two SEPARATE roles (do not confuse them)

You raised the right question: *"why do I sign, if I'm not the treating physician?"*
You don't — not as a treating physician. AllyOS is a decision-support **product**, and there
are two different sign-offs that must stay separate:

---

## A · PUBLISH — RenuviaMD / Dr. Falcon, as the AllyOS content curator (editorial, NOT prescribing)

This is the only signature with your name **in the product**, and it is **not a prescription,
not a treatment authorization, and not a medical-director relationship with any patient.** It is
an **editorial attestation** — like an editor signing a monograph for publication, or an UpToDate
author — that the DRAFT library content is accurate and fit to ship as reference. The library is
published *"curated under Armando A. Falcon, MD,"* so this is you vouching for **content quality,
nothing more**. No patient. No chart. No order.

- **Effect of publishing:** the item moves from `draft` (experimental/hidden) to `published` in the AllyOS library. It remains **ADVISORY** for every clinic that brings its own Medical Director.

## B · ADOPT & PRESCRIBE — each clinic's OWN treating physician / Medical Director

The clinic's MD/NP/PA **reviews the AllyOS template, customizes it, and signs it as their own**
GFE / standing order, for their own patients. **That signature is theirs, not yours.** AllyOS hands
them the draft → they review → adopt → sign. AllyOS never prescribes and never signs for another
clinic's patients. This is exactly the "we don't regulate the practice" line — we inform; their
physician decides and signs.

## C · ENFORCE — only in MD-of-Record mode

The "avoid = hard stop" enforcement keys to **whoever IS the Medical Director of record** for that
deployment. For a bring-your-own-MD clinic that is **their** doctor, and AllyOS stays advisory.
**You sign as the treating / MD-of-record physician ONLY for clinics where RenuviaMD is contracted
as the Medical Director** — never for the others.

---

## So, concretely

| Action | Who | What it is |
|---|---|---|
| **Publish** the draft library content | You (AllyOS curator) | Editorial QA — "this reference is accurate." No patient. |
| **Adopt & sign** the GFE / standing order | The clinic's treating physician | Their clinical decision, their patients, their signature. |
| **Enforce** as hard stops | The contracted MD-of-record | Only where RenuviaMD is the MD of record. |

## What's awaiting *your* (publish) decision

These are DRAFT **library content** — publishing them just makes them standard (still advisory)
reference; it does **not** order anything for a patient:

| Item | File | Publish status |
|---|---|---|
| Ingredient-level GFE screening contraindications v0.1 | `protocols/ingredient-screening-contraindications.json` | ☐ unpublished draft |
| Niagen / NR monograph + NR-01 protocol | `protocols/draft-additions.json` | ☐ unpublished draft |
| Niagen / NR IV standing-order **template** | `protocols/niagen-nr-iv-standing-order.md` | ☐ unpublished draft (a template for clinics — the clinic's prescriber signs the actual order) |

### To publish (3 steps)
1. **Review** the item (📖 Reference drawer or the file).
2. **Attest** — add a row below (editorial, not prescriptive).
3. Tell me **"publish X"** and I flip its `status` from `draft` → `published` and commit it under your name. The git commit is the record.

### Publish attestation template
```
- Item: <file + version>
  PUBLISHED to the AllyOS library as accurate decision-support reference (curator editorial review).
  This is NOT a prescription or treatment authorization for any patient.
  Curator: Armando A. Falcon, MD   (RenuviaMD® AllyOS Compliance Division)
  Date: 2026-__-__                 Commit: <sha>
  Edits required before publish: <none | list>
```

## Published entries

_(none yet)_

> The clinic-side GFE / standing-order signatures live in each clinic's own records — NOT here.
> This ledger is only AllyOS's editorial publish record.
