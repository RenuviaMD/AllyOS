# AllyOS — Session Log & Decisions (durable memory)

_Last written: 2026-06-22. Branch: `claude/funny-sagan-clvl38`. This file is the canonical record of decisions from the working session, written to disk so nothing is lost. Append, don't delete._

---

## 0. WHO / WHAT
- **Dr. Armando A. Falcon, MD** — FL License ME 84789, RenuviaMD® PLLC, Florida Medical Director.
- **Platform = AllyOS** · **AI = Ally** · lives at `allyos.renuviamd.com`, one repo `RenuviaMD/allyos` (cockpit to stand up). This repo (`armandofalcon66/renuviamd-site`) is the **prototype** that ports into it.
- **NOT "PeptidOS"** — peptides are the flagship *line*, not a separate brand. One platform, one login, one name.

## 1. SECURITY RULES (never violate)
- **Never paste a secret key in chat or commit it.** Claude key (`sk-ant-…`) and Stripe **secret** (`sk_live_…`) go **only** into Netlify env vars.
- **Only public Stripe Payment Links** (`https://buy.stripe.com/…`) are safe to paste in chat.
- **No fabricated citations** — cite real PubMed/DOI/NCT or flag **VERIFY**.
- **PHI never on the platform** — Visit Packet is client-side/ephemeral; Ally is firewalled to protocol-level only.
- Develop on branch `claude/funny-sagan-clvl38`; never push other branches without permission.
- Model identifier must NOT appear in commits/PRs/artifacts.

## 2. STRATEGIC DIRECTION (locked this session)
- **AllyOS is B2B.** Sold to clinics / licensed providers. **No patient-facing anything.**
- **No patient marketing on our side** — each clinic owns its own marketing. The Compendium's Marketing/Patient-Acquisition chapter (Ch 39) is *clinic content at most*, **not a feature AllyOS builds**. Dropped from scope.
- **Legal set aside as a build blocker** — Dr. Falcon handles that track on his own timeline. Build proceeds.
- **You sell reference + software + services — never peptides, never a prescription.** This is the core defensive line.

## 3. ⭐ THE RETENTION + REGULATORY-SHIELD INSIGHT (most important)
What keeps the competitor's clients attached: **the NPI-verified provider does EVERYTHING in one place** —
**see / browse → research → ask the AI → clarify questions → do POC (point-of-care documentation) → ORDER peptides** — all in a single platform.

The regulatory trick: the platform **acts as a "virtual MD" without taking regulatory risk**, because
**all clinical weight and responsibility flow to the identified, NPI-verified provider.**
- **NPI verification is not just a gate — it is the liability firewall.** By gating to verified licensed providers and making the provider the decision-maker, the platform stays a *tool*, not a *practitioner*. The provider assumes prescribing/clinical responsibility.
- This is *why* they can deliver MD-level intelligence (research + AI + POC + ordering) without practicing medicine themselves.

**For AllyOS:** replicate the **"one place for everything" stickiness** (browse + research + Ally + POC/Visit Packet) — but **OMIT the peptide ordering/fulfillment** (we don't sell peptides; that keeps our liability clean). The NPI-as-liability-firewall logic still applies to us: it transfers clinical responsibility to the provider, which is what lets us comfortably offer POC / stack / consent tooling.

## 4. COMPETITOR TEARDOWN — "Peptide Protocol Portal" (AI = "Peppy")
- Pure **B2B SaaS subscription**, NPI-gated, **+ hidden revenue: wholesale fulfillment** ("orders tied to verified NPI," "order by conversation"). They broker the peptide sale too. **We deliberately don't.**
- **62 clinical guides / 10 categories; team-seat management; doc templates/consent/SOAP; B2B wholesale ordering.**
- Tiers: **Base $0** (browse DB + calculator + regulatory tracker + 3 guides) · **Compound $79/mo** (Base + 62 guides + operators manual + doc templates + **Peppy static knowledge base** + document hub + NPI + team seats) · **Catalyst $149/mo** (Compound + **Peppy Pro full conversational** + **500 AI queries/mo** + fills order forms + AI protocol recs + interaction lookups + support).

### ⭐ They TIER THE AI ITSELF (the margin lever)
- **"Static knowledge base" ≈ retrieval/canned** → near-zero marginal cost → included unlimited at $79.
- **"Pro conversational" = live model per message** → real cost → **capped at 500/mo**, charged at $149. **The query cap IS the margin control.**

### Our two margin levers (one is free money)
1. **Cap queries per tier** (Member ~50/mo, Top ~500/mo).
2. **Enable Anthropic prompt caching** on the system-prompt + `knowledge.json` block. Today `ask.js` re-injects the full 107 KB KB every query (~30k+ input tokens). Prompt caching cuts input cost ~90% on cache hits. **First optimization to make now that the API key exists.**

### Where we WIN (the moat)
Their copy is hype ("knows every compound," "always current," "synergy checks"). **Our moat is honesty:** Ally grades **D**, names failed trials, cites real sources or flags **VERIFY**, and there's a **real named Medical Director (Dr. Falcon)** behind it. *"The honest one, backed by a real MD."*

## 5. PEPTIDE PRODUCT MODEL (in `protocols/peptide-packs.json`, pushed)
- **GLP-1s are continuous, overlap, NOT cycled → never stacked together.** Sold as a **GLP-1 Package** (one backbone: sema/tirze/reta/lira) + a **Transition/Switch Protocol** to move between them.
- **Cyclable adjuncts** (Sermorelin, AOD-9604, MOTS-c, SS-31) CAN be combined.
- **Weight-Loss Stack** = any **1 GLP-1 + Sermorelin and/or AOD-9604** (appetite control + lean-mass/lipolysis support; complements, doesn't overlap).
- **Consent tier auto-escalates to the highest component** (Compendium Ch.4 §1.3); **Combination Consent Addendum** required on stacks (Ch.4 §5.1); **merged calendar** staggers continuous GLP-1 titration vs. cycled adjuncts.
- **Consent/intake delivered via the Visit Packet** (PHI-free), not static distribution.
- Data confirmed: sema/tirze/reta/lira = `Cycle: Chronic`; aod-9604 8–12wk, mots-c/ss-31/sermorelin cycled. Grades: sema/tirze/lira A; reta B (but investigational → Tier 3); aod-9604 D; mots-c D→C; ss-31 B−; sermorelin B(peds)→D(adult wellness).

## 6. FULL PRICING CATALOG (proposed; numbers not final)
**Educational (one-off, sell now, low-liability):** Intro to Peptide Therapy $49 · **Monograph $99** · **Compendium 2026 $997** (annual).
**Peptide operational packs (one-off):** Practice Pack (single peptide) $295 · GLP-1 Package $295 · Transition Protocol $149 · Weight-Loss Stack $595 · Build-Your-Own Metabolic Stack from $595 (dynamic → Stripe Checkout + secret key, later).
**Line bundle (one-off, high ticket):** Metabolic Line Complete $1,995 (AmSpa SOP pkg = $2,995). BHRT/IV/PRP/Aesthetics later.
**AllyOS Membership (recurring — the engine):** Member $99/mo or $990/yr · Top $199/mo or $1,990/yr. *(Open question: price Member/Top at $79/$149 to undercut, or $99/$199 to sit above on the honesty positioning.)*
**MD-client implementation (NOT self-serve):** MD engagement retainer (custom invoice, capped 10–12 clinics) · per-line ~$445/line.

### Billing → Stripe mapping
- One-off + recurring → simple **Payment Links** (public URLs, no secret key).
- Dynamic (Build-Your-Own stack) → **Stripe Checkout** + Netlify fn + secret key (later).
- MD engagement → Stripe **Invoices** (not in store).

## 7. ⭐ REVISED TIER STRUCTURE (mirror the smart parts)
| Tier | Price | Contents |
|---|---|---|
| **Free / Base** | $0 | Regulatory DB + calculator + 3 guides (SEO funnel) |
| **Member** | $79–99/mo | Full library/compendium + guides + **Ally capped (~50 q/mo)** + update radar |
| **Top** | $149–199/mo | **Ally Pro (500 q/mo)** + Visit Packet (consent/intake/note) + compliance check |
| **+ Team seats** | per seat | clinic multi-provider — *we don't have this yet; it's how you grow B2B* |
Our Top-tier premium AI feature = **Visit Packet generation** (not order-filling — we don't order).
**Bundling decision:** subscription is the main play; keep $997 Compendium as a buy-outright alternative; fold monographs/guides into Member rather than selling 30 à la carte.

## 8. WHAT NEEDS DR. FALCON
1. **Claude API key** → Netlify env `ANTHROPIC_API_KEY` (Functions scope), then redeploy. (Key in hand as of this session.)
2. **Stripe Payment Links** — create products, paste public `buy.stripe.com/…` URLs. Start with $99 Monograph + $997 Compendium (one-off, NOT recurring). Generic statement descriptor (`RENUVIAMD`/`ALLYOS`), no "peptide."
3. Confirm `allyos` repo home (new `RenuviaMD/allyos` vs. repurpose `os-prototype`).
4. Finalize prices / pick which SKUs to create first.
5. (Own track) legal review of consents/intake/MD agreement.

## 9. BUILD SEQUENCE / WHERE WE RESUME
**Phase 0 (this repo, no blockers):**
1. Add **prompt caching + query-cap counter to `ally/netlify/functions/ask.js`** (protect API margin before Ally goes live).
2. Wire **store + stack configurator** to `peptide-packs.json` (cards, auto-tier badge, "no two GLP-1s" rule).
3. Encode tier structure into **`pricing.json`** (Free/Member/Top + query caps + seats).
4. Drop in Stripe Payment Links when URLs arrive → $99/$997 go live.
**Phase 1 (cockpit):** stand up `RenuviaMD/allyos` → Netlify → subdomain → port static tools → NPI gate + tiers → wire Ally backend.
**Phase 2 (after legal):** turn on Practice Pack/Stack consent delivery; design pass; then BHRT/IV/PRP.

## 10. KEY ASSETS ALREADY BUILT (prototype, this repo)
`protocols/`: regulatory-database.html · calculator.html · library.html (+ chapters/, protocols.json — 30 monographs + 7 stacks) · index.html + avenues.json (5 lines) · **poc.html (Visit Packet)** · peptide-packs.json · build-*.py generators · COMPENDIUM-2026-UPDATE-PACK.md (VERIFY flags pending sign-off).
`ally/`: SYSTEM-PROMPT.md · knowledge.json (107 KB) · index.html · netlify/functions/ask.js (model `claude-sonnet-4-6`, reads `ANTHROPIC_API_KEY`).
`allyos/index.html` (dashboard shell) · ALLYOS-BUILD-PLAN.md (master spec).

## 11. COMPENDIUM STRUCTURE (40 chapters, reference)
40-chapter "Comprehensive Peptide Therapy Compendium." Foundations (1–4: Intro, Evidence Grading, Safety, **Informed Consent**); Weight-Loss & Metabolic (5–14); Growth Hormone (15–22); Hormonal/Sexual (23–27); Regenerative (28–31, BPC-157/TB-500 education-only); Cognitive (32–36); Longevity (37–39); **Practice Implementation (37–40: Business/Legal, Pharmacy, Marketing[dropped from AllyOS scope], Practice Systems)**. Ch.4 §1.3 = consent tiers by grade; §5.1 = combination-therapy consent. Ch.40 = intake/consultation/titration/POC workflows (source for Visit Packet).
