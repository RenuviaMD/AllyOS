# AllyOS — Master Build Plan

_The honest, multi-line clinical operating system by RenuviaMD® Compliance Division._
_Platform = **AllyOS** · AI = **Ally** · curated by Armando A. Falcon, MD (FL ME 84789)._

---

## 1. What it is (one line)
An NPI-gated clinical OS for licensed providers — protocols + regulatory intelligence + honest AI + on-device documentation — across **5 lines of care**, anchored by a real Medical Director. Honest (grades D, cites failures), multi-line, and **PHI-free**.

## 2. Where it lives (architecture)
| Zone | Home | Gated? | Holds |
|---|---|---|---|
| **Marketing / funnel** | `myfloridamedicaldirector.com` (AHCAClinicPortal) | public | SEO: regulatory DB, protocols showcase, SpaSafe/PeptideGuard pitches → CTA "Enter AllyOS" |
| **AllyOS — the app** | **`allyos.renuviamd.com`** · one **`RenuviaMD/allyos`** repo | login | the 5 tools + membership tiers + Ally backend |
| **Prototype/reference** | `armandofalcon66/renuviamd-site` (this) | — | everything below, built static → ports into the app |

**Consolidation:** AllyOS absorbs the scattered OS repos — repurpose `renuviamd-os-prototype` (most infra) OR start clean `RenuviaMD/allyos`; fold in `bioaxis` (peptide OS) + `medical-director-console`; **archive the rest.** One app, one name, one subdomain.

## 3. The 5 lines of care (`protocols/avenues.json`)
🧬 Peptides (flagship) · ⚕️ BHRT (men+women) · 💧 IV & IM Wellness · 🩸 Regenerative/PRP · ✨ Aesthetics.
~60 protocol families + ~34 operational protocols + Dr. Falcon's compliance guardrails captured.

## 4. The tools (membership tiers)
| Tool | Tier | Built? | File |
|---|---|---|---|
| Regulatory Database | Free (SEO) | ✅ | `protocols/regulatory-database.html` |
| Reconstitution Calculator | Free | ✅ | `protocols/calculator.html` |
| Protocols / Compendium | Member | ✅ | `protocols/library.html` + `chapters/` + `protocols.json` |
| **Ally** — clinical AI | Member | ✅ | `ally/` (system prompt + knowledge.json + Netlify fn) |
| Line-of-care catalog | Member | ✅ | `protocols/index.html` + `avenues.json` |
| **Visit Packet** (intake·consent·note·handout·compliance) | **Top tier** | ✅ | `protocols/poc.html` |
| AllyOS shell/dashboard | — | ✅ | `allyos/index.html` |

## 5. Two business legs
- **Reference (mass-market, scalable, low-liability):** monographs/compendium + membership + Ally — sold to any licensed provider, unsigned. **The funnel + scale.**
- **Implementation (MD-clients only, premium, capped):** signed, customized per-line packages (peptides/BHRT/IV/PRP) under Dr. Falcon's medical direction. **The moat.**

## 6. Pricing (AmSpa-benchmarked)
- Single Clinical Protocol Monograph **$99** · 4-stack **$350** · Compendium **$997** (consider $1,995–2,995 vs AmSpa's $2,995 SOP package).
- Membership (Member tier) — discounts + Ally + radar; **Top tier** adds the Visit Packet.
- MD-client implementation: per-line fee in the retainer (~$445/line "1-cycle").
- **No forced subscription** except the OS membership (software, currency = the value).

## 7. PHI boundary (non-negotiable)
- **Ally (AI):** server-side, **protocol-level only, no PHI** (system prompt enforces; firewalled from the Visit Packet).
- **Visit Packet:** **100% client-side**, on-device, ephemeral; workday `localStorage` only; **patient data never reaches AllyOS servers** → no BAA, never a PHI platform.
- One-time **legal review** of the MD agreement + consent templates (your ByrdAdatto equivalent) — not a 50-state law-firm build.

## 8. Honesty discipline (the brand)
Evidence grades A–D + R/Y/G; name failed trials; **never fabricate** (cite or flag VERIFY); the update agent re-verifies cited sections (fail-closed) and Dr. Falcon signs off. Liability box: "prescriber assumes full risk."

## 9. Content status
- **30 peptide monographs** (incl. Semaglutide, Melanotan II, Liraglutide, MK-677, GHRP-2/6, Gonadorelin, Hexarelin); 5 obscure deferred to next edition.
- **Chapters:** Intro + MOTS-c (premium, design-Claude template); 30 chapter prebuild files exported.
- **2026 Update Pack** (verified): Elamipretide approval, Thymosin α1 sepsis failure, GLP-1 approvals, Orforglipron, PCAC/Category-2 — **VERIFY flags pending Dr. Falcon sign-off**.
- BHRT/IV/PRP family "focus" bullets: **to author** (you dictate, or I draft for review).

## 10. Build order (port prototype → real AllyOS app)
1. **Stand up `RenuviaMD/allyos`** (repo + Netlify + `allyos.renuviamd.com`) — cockpit.
2. **Port the static tools** (regulatory DB, calculator, visit packet, catalog, library) — near as-is.
3. **Build the gate** — NPI/attestation → membership tiers (Free / Member / Top).
4. **Wire Ally backend** — Netlify function + `ANTHROPIC_API_KEY` + `knowledge.json`.
5. **Stripe** — monograph/stack/compendium + membership; `/terms`.
6. **Link from marketing site** → "Enter AllyOS".
7. **Design pass** (design Claude) — premium skin across the app.
8. **Then:** author BHRT/IV/PRP focus; build the 40 chapters; extend Visit Packet to all lines.

## 11. What needs YOU
- Anthropic API key (Ally) · Stripe links + prices · legal review (MD agreement + consents) · clear the Update-Pack VERIFY flags · the BHRT/IV/PRP focus content · pick/confirm the `allyos` repo home.

---
_Everything above is built as a static prototype in this repo and committed to `claude/funny-sagan-clvl38`. The cockpit lifts it into the real app at `allyos.renuviamd.com`._
