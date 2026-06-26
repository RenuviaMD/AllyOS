# Medical Director sign-off ledger

**Where DRAFT clinical content gets signed and promoted to enforced.** AllyOS keeps every
new clinical layer as a `status:"draft"` until the Medical Director of record signs it here.
The signature is an **attestation** (name · license · date · the exact item + version), and the
**git commit that records it** — authored by Dr. Falcon's account — is the audit trail.

> AllyOS is advisory and enforces only where RenuviaMD is the Medical Director of record.
> Signing here is what flips an item from *advisory draft* to *enforced*.

---

## What is currently awaiting sign-off

| Item | File | Status |
|---|---|---|
| Ingredient-level GFE screening contraindications v0.1 | `protocols/ingredient-screening-contraindications.json` | ☐ DRAFT — unsigned |
| Niagen / NR ingredient + NR-01 protocol | `protocols/draft-additions.json` | ☐ DRAFT — unsigned |
| Niagen / NR IV standing order v0.1 | `protocols/niagen-nr-iv-standing-order.md` | ☐ DRAFT — unsigned |

## How to sign (3 steps)

1. **Review** the item (open it in the 📖 Reference drawer or the file). Confirm doses, gates, contraindications, and citations.
2. **Attest** — add a signed row to the ledger below (copy the template). Use your real name + license + date.
3. **Promote** — in that item's JSON, set `"status":"locked"`, `"requires_md_signoff":false`, fill `"signed_by"`/`"signed_date"`, and bump the version. (Tell me and I'll make the edit + commit it under your name, or you can edit + commit on the branch yourself — the commit is the legal trail.)

For the **standing order** specifically (NR-01), a clinical standing order is a prescriptive
document — in addition to this ledger, sign the actual order (wet or e-signature on the PDF/printout)
the way you sign your other standing orders, since that is the artifact your board/audit expects.

## Attestation template (copy a block per item)

```
- Item: <file + version, e.g. ingredient-screening-contraindications.json v0.1>
  Reviewed and approved as Medical Director of record.
  Name: Armando A. Falcon, MD     License: FL ME 84789
  Date: 2026-__-__               Commit: <git sha after promotion>
  Limitations / edits required before enforcement: <none | list>
  Signature: ____________________________
```

## Signed entries

_(none yet — sign above to promote the first item)_

---

### Notes on what "signed" changes
- A signed screening map becomes **enforced**: in MD-of-record mode its `avoid` rules are hard stops at the bench (today they are red advisories).
- A signed NR-01 becomes a **live selectable protocol** (the DRAFT badge drops, it can be a default), and the Niagen ingredient leaves the draft lane into the locked inventory.
- Anything you mark "edits required" stays draft until the edit + a fresh signature.
