# AllyOS — Peptide Dosing Reference (dose · route · frequency · cycle · rest · suggested reconstitution)

_Compiled 2026-06-23 from 5 parallel research passes, cross-checked against the MD-curated protocols.json. Decision-support for licensed providers._

**Reconstitution policy (locked):** units are NEVER baked — the live calculator computes them from the provider's actual vial mg + BAC mL. 'Suggested recon' below is only a calculator DEFAULT to pre-fill.

**Format flags:** only FDA-label doses are validated (Semaglutide, Tirzepatide, Liraglutide, Tesamorelin, PT-141/Vyleesi). Everything else is **empiric / community-protocol, NOT validated (VERIFY)**.

**Special reconstitution cases:** GLP-1s + Vyleesi = commercial pens (no recon) · **Tesamorelin = STERILE WATER 2.1 mL, not BAC** · MK-677 = oral (no recon) · Cerebrolysin = pre-made ampoule (no recon) · Semax/Selank = intranasal (conventional) + SC (empiric).

---


# === Metabolic / Incretin / Mitochondrial ===

# Metabolic / Longevity Peptide Dosing Protocols

_Decision-support compilation for LICENSED providers. Source of record: `/home/user/renuviamd-site/protocols/protocols.json` (MD-curated, Armando Falcon MD). FDA-approved agents use the label titration; non-approved/compounded uses are empiric community-protocol and flagged **VERIFY**._

---

### Semaglutide
- **Dose:** Weight mgmt (Wegovy): 0.25 → 0.5 → 1.0 → 1.7 → 2.4 mg. T2D (Ozempic): 0.25 → 0.5 → 1.0 → up to 2.0 mg. Oral (Rybelsus): 3 mg ×30d → 7 mg → 14 mg daily. **Route:** SC once weekly (oral daily for Rybelsus, fasting + plain water). **Frequency:** weekly; up-titrate no faster than every 4 weeks (start 0.25 mg/wk ×4 wk).
- **Cycle:** Chronic, indication-dependent (weight/glucose effects regress on discontinuation). **Rest:** Continuous — no off period.
- **Suggested recon (calculator default):** Commercial pen/vial is pre-mixed — no reconstitution. (Compounded only if used: verify labeled concentration; typical 5 mg/0.5 mL or as supplied.)
- _Basis: FDA label (Wegovy/Ozempic/Rybelsus). Citations in library: Sanyal 2025 NEJM (ESSENCE/MASH); Perkovic 2024 NEJM (FLOW). Grade A._

---

### Tirzepatide
- **Dose:** 2.5 mg ×4 wk → 5 mg; titrate +2.5 mg every 4 wk to max **15 mg** (typical effective 10–15 mg). **Route:** SC once weekly. **Frequency:** weekly; escalate q4wk to tolerance, not by calendar.
- **Cycle:** Chronic. **Rest:** Continuous — no off period.
- **Suggested recon (calculator default):** Commercial pen/vial pre-mixed — fixed 0.5 mL, no math. (Compounded vials vary — verify concentration before dosing.)
- _Basis: FDA label (Mounjaro/Zepbound). Citation in library: Jastreboff 2022 NEJM (SURMOUNT-1). Grade A._

---

### Retatrutide  — **VERIFY (investigational; NOT FDA-approved)**
- **Dose:** Start 2 mg SC weekly; titrate slowly toward 8–12 mg (trial range). **Route:** SC. **Frequency:** once weekly; slow titration (glucagon arm can raise resting HR — monitor).
- **Cycle:** Chronic in trials (investigational). **Rest:** Continuous — no off period (no validated cycling).
- **Suggested recon (calculator default):** 12 mg vial + 1.2 mL BAC water = 10 mg/mL → 2 mg = 0.20 mL = **20 units** (U-100).
- _Basis: **Empiric / community-protocol — NOT validated.** Phase 3 ongoing; no approved label. Trial titration only; compounded dosing is empiric. Library citations: Jastreboff/Kaplan/Frías 2023 NEJM; Katsi 2025 Biomolecules. Grade B (efficacy data), dosing unvalidated._

---

### Liraglutide
- **Dose:** Weight mgmt (Saxenda): 0.6 mg daily, +0.6 mg each week → **3.0 mg** daily. T2D (Victoza): 0.6 mg daily ×1 wk → 1.2 mg → 1.8 mg. **Route:** SC once daily. **Frequency:** daily; weekly titration steps to limit nausea.
- **Cycle:** Chronic. **Rest:** Continuous — no off period.
- **Suggested recon (calculator default):** Commercial multi-dose pen pre-mixed (6 mg/mL) — no reconstitution.
- _Basis: FDA label (Victoza/Saxenda; generics 2024–25). Citation in library: Fox 2024 NEJM (SCALE Kids). Grade A._

---

### AOD-9604  — **VERIFY (investigational; NOT FDA-approved)**
- **Dose:** 300 mcg SC daily; range 250–500 mcg/day. **Route:** SC (fasted / AM). **Frequency:** daily.
- **Cycle:** 8–12 weeks. **Rest:** Reassess at end of cycle; stop if no objective change by ~6 months. No standardized validated off-period — pause/discontinue if no benefit.
- **Suggested recon (calculator default):** 5 mg vial + 2 mL BAC water = 2.5 mg/mL (2,500 mcg/mL) → 300 mcg = 0.12 mL = **12 units** (U-100).
- _Basis: **Empiric / community-protocol — NOT validated.** Phase 2 obesity development discontinued for lack of efficacy; zero registered trials. Library citations: Heffernan 2001 (preclinical); Wilding 2004 (review). Grade D._

---

### MOTS-c  — **VERIFY (investigational; NOT FDA-approved)**
- **Dose:** 5–10 mg SC per dose. **Route:** SC. **Frequency:** 2–3× per week.
- **Cycle:** 4–8 weeks, tied to a metabolic endpoint (HOMA-IR / A1c). **Rest:** Continue only if objective metabolic benefit; stop if no durable change — no validated fixed off-period.
- **Suggested recon (calculator default):** 10 mg vial + 1 mL BAC water = 10 mg/mL (10,000 mcg/mL) → 5 mg = 0.50 mL = **50 units** (U-100).
- _Basis: **Empiric / community-protocol — NOT validated.** No completed human therapeutic RCT (first Phase 2a, NCT07505745, recruiting). Library citations: Lee 2015 Cell Metab; Kumagai 2021; Zheng 2023. Grade D→C._

---

### SS-31 (Elamipretide)  — split by use
**FDA-approved use (Barth syndrome — FORZINITY):**
- **Dose / Route / Frequency:** Per the FDA-approved FORZINITY (elamipretide) label for Barth syndrome — weight-based SC once daily. **Confirm exact per-kg dose and any titration directly against the current FORZINITY prescribing information before prescribing** (not specified in the RenuviaMD library, which catalogs the compounded metabolic use).
- **Cycle / Rest:** Chronic, continuous — no off period.
- _Basis: FDA label (FORZINITY, elamipretide; Barth syndrome). VERIFY exact dosing against the prescribing information — not enumerated in protocols.json._

**Compounded / off-label metabolic-longevity use — VERIFY (NOT FDA-approved for this):**
- **Dose:** 5–10 mg SC daily (empiric). Mitochondrial-myopathy trial dosing was 40 mg SC daily. **Route:** SC. **Frequency:** daily.
- **Cycle:** 4–8 weeks. **Rest:** Reassess at 1–6 months; stop if no durable functional benefit. No validated off-period.
- **Suggested recon (calculator default):** 10 mg vial + 1 mL BAC water = 10 mg/mL (10,000 mcg/mL) → 10 mg = 1.0 mL = **100 units** (U-100); for a 5 mg dose = 0.5 mL = **50 units**.
- _Basis: **Empiric / community-protocol — NOT validated** for metabolic/longevity use. Pivotal Phase 3 in mitochondrial myopathy (MMPOWER-3) missed endpoints/terminated; aging Ph2a recruiting (NCT07275424). Library citations: Karaa 2023 Neurology (MMPOWER-3); Karaa 2020; Szeto 2014. Grade B−._

---

**Standing cautions (all incretins — sema/tirze/reta/lira):** screen out personal/family MTC or MEN-2 (boxed warning), acute/prior pancreatitis, severe gastroparesis, pregnancy/lactation. Cut sulfonylurea/insulin at start to avoid hypoglycemia; counsel on reduced oral-contraceptive reliability (delayed gastric emptying). Retatrutide additionally: monitor resting HR (glucagon agonism).

---


# === Growth-Hormone Secretagogues ===

# GH-Secretagogue Dosing Protocols — AllyOS Calculator Defaults

> **Decision-support for LICENSED providers only.** Except where noted, these are GH secretagogues used **compounded / research-only**; dosing below is **empiric / community-protocol, NOT clinically validated** — marked **VERIFY**. Tesamorelin uses the FDA label dose. Reconstitution figures are **suggested calculator DEFAULTS**, editable per pharmacy fill; all concentrations are U-100 insulin-syringe "units."
>
> **GH-secretagogue timing convention:** dose at **bedtime, fasted** — at least ~2-3 h after the last meal and away from carbohydrates/food, since glucose/insulin and somatostatin blunt the GH pulse. Single nightly dose maximizes the natural nocturnal GH surge; multi-daily dosing (pre-meal/post-workout) is also reported.

---

### Sermorelin
- **Dose:** 300 mcg typical (range 200–500 mcg) **Route:** SC **Frequency:** nightly at bedtime, fasted (some protocols 5-on / 2-off)
- **Cycle:** 12–24 weeks, then reassess **Rest:** no fixed washout; titrate to lowest effective dose, hold/stop if IGF-1 flat or symptoms resolve (effectively continuous-with-reassessment)
- **Suggested recon (calculator default):** 5 mg vial + 5 mL BAC → 1 mg/mL = 1,000 mcg/mL → 300 mcg = 0.30 mL = **30 units**
- _Basis: empiric-VERIFY — brand Geref (GHRH 1-29) was FDA-approved for pediatric GHD dx/tx but is discontinued; adult "anti-aging" use is compounded/off-label with no RCTs (Walker 2006; Prakash & Goa 1999)._

### CJC-1295 (no-DAC / mod GRF 1-29)
- **Dose:** 100 mcg typical (range 100–200 mcg) **Route:** SC **Frequency:** nightly at bedtime, fasted (no-DAC; the DAC ester is 1–2 mg **weekly** — different molecule/schedule)
- **Cycle:** 12–16 weeks **Rest:** continuous-with-reassessment; titrate to upper-normal IGF-1, lowest effective dose
- **Suggested recon (calculator default):** 5 mg vial + 2.5 mL BAC → 2 mg/mL = 2,000 mcg/mL → 100 mcg = 0.05 mL = **5 units**
- _Basis: empiric-VERIFY — only human RCT is of the **DAC** form (Teichman 2006, JCEM; t½ ~6–8 d). No-DAC borrows that molecule's credibility; Ph2 NCT00267527 terminated. Almost always paired with a ghrelin agonist._

### CJC-1295 + Ipamorelin (blend)
- **Dose:** ~100 mcg CJC + 200–300 mcg ipamorelin (per nightly dose) **Route:** SC **Frequency:** one injection nightly at bedtime, fasted
- **Cycle:** 12–16 weeks **Rest:** continuous-with-reassessment; titrate to upper-normal IGF-1
- **Suggested recon (calculator default):** 5 mg CJC + 5 mg ipamorelin co-vialed + 2.5 mL BAC → 2 mg/mL each = 2,000 mcg/mL → 0.15 mL = **15 units** (≈300 mcg of each per dose)
- _Basis: empiric-VERIFY — **no human trials of the combination**; supporting data are animal + review-level only (Mayfield 2026, Am J Sports Med). Dual-pathway (GHRH + GHRP) synergy is the rationale, not proven efficacy. Watch fluid retention/glucose on titration._

### Ipamorelin
- **Dose:** 200–300 mcg (typical 300 mcg) **Route:** SC **Frequency:** nightly at bedtime, fasted (or BID)
- **Cycle:** 12–16 weeks **Rest:** continuous-with-reassessment; lowest effective dose
- **Suggested recon (calculator default):** 5 mg vial + 2.5 mL BAC → 2 mg/mL = 2,000 mcg/mL → 300 mcg = 0.15 mL = **15 units**
- _Basis: empiric-VERIFY — cleanest GHRP (minimal cortisol/prolactin/hunger). Two completed human Ph2 trials (GI motility) were **both negative** (Beck 2014); zero human efficacy data for anti-aging/body-composition use._

### GHRP-2 (Pralmorelin)
- **Dose:** ~100 mcg typical (reported range 100–300 mcg) **Route:** SC **Frequency:** 1–3× daily (e.g., AM fasted / pre-bed / post-workout); bedtime-fasted dose leverages GH pulse
- **Cycle:** no validated protocol (community 8–12 wk cycling reported) **Rest:** no validated washout
- **Suggested recon (calculator default):** 5 mg vial + 2.5 mL BAC → 2 mg/mL = 2,000 mcg/mL → 100 mcg = 0.05 mL = **5 units**
- _Basis: empiric-VERIFY (Grade D) — recognized **GH-stimulation diagnostic** agent abroad; **no US therapeutic approval** and no efficacy trials for wellness/anti-aging. Watch appetite/cortisol/prolactin. Often stacked with a GHRH analog (unproven)._

### GHRP-6
- **Dose:** ~100 mcg typical (reported) **Route:** SC **Frequency:** 1–3× daily; bedtime/fasted convention applies
- **Cycle:** no validated protocol **Rest:** no validated washout
- **Suggested recon (calculator default):** 5 mg vial + 2.5 mL BAC → 2 mg/mL = 2,000 mcg/mL → 100 mcg = 0.05 mL = **5 units**
- _Basis: empiric-VERIFY (Grade D) — no human efficacy trials for wellness use; **marked appetite stimulation** is the defining effect. 2024–26 literature preclinical (cardioprotective/anti-fibrotic) only._

### Hexarelin (Examorelin)
- **Dose:** ~100 mcg typical (reported) **Route:** SC **Frequency:** 1–2× daily; bedtime/fasted convention applies
- **Cycle:** no validated protocol; **deliberately short / intermittent** due to receptor desensitization (tachyphylaxis) **Rest:** off-periods advised to limit GHSR desensitization (no validated schedule)
- **Suggested recon (calculator default):** 5 mg vial + 2.5 mL BAC → 2 mg/mL = 2,000 mcg/mL → 100 mcg = 0.05 mL = **5 units**
- _Basis: empiric-VERIFY (Grade D) — most potent GHRP but **prone to receptor desensitization**; no human therapeutic approval or efficacy trials. 2024–26 literature preclinical/analytical only._

### Tesamorelin (Egrifta / Egrifta SV)
- **Dose:** **EGRIFTA SV: 1.4 mg** SC once daily · **original EGRIFTA: 2 mg** SC once daily **Route:** SC (abdomen, rotate sites) **Frequency:** once daily (label)  *[audit-corrected]*
- **Cycle:** continuous per label; off-label VAT protocols reassess at 12–26 weeks **Rest:** continuous (no scheduled off-period); discontinue if no VAT response or per clinical judgment
- **Suggested recon (calculator default):** **EGRIFTA SV → reconstitute with 0.5 mL Sterile Water, inject 0.35 mL (1.4 mg).** Original EGRIFTA → 2.1 mL Sterile Water, inject 2 mL (2 mg). **Sterile Water for injection, NOT BAC.** *[audit-corrected: SV ≠ original Egrifta]*
- _Basis: **LABEL** — FDA-approved (2010) HIV-associated lipodystrophy. EGRIFTA SV = 1.4 mg/0.5 mL recon; original EGRIFTA = 2 mg/2.1 mL. Pivotal Ph3 VAT −15.4% vs placebo, glucose-neutral (Falutz 2010, JCEM, doi:10.1210/jc.2010-0490). Anti-aging use off-label._

### MK-677 (Ibutamoren)
- **Dose:** 10–25 mg typical (reported) **Route:** **oral** **Frequency:** once daily, usually at night (long ~24 h half-life sustains 24 h IGF-1 elevation; bedtime favored for sleep/GH-pulse effect)
- **Cycle:** community cycling reported; no validated protocol **Rest:** no validated washout
- **Suggested recon (calculator default):** **oral — n/a** (no reconstitution; capsule/tablet/oral solution)
- _Basis: empiric-VERIFY (Grade C/D) — orally active ghrelin/GHS-R agonist; raises IGF-1 but **no FDA approval / no approved indication**. Causes **fluid retention, increased appetite, insulin resistance**; new atraumatic splenic-rupture case report with RAD-140 (Jaffry 2026, Cureus). Monitor glucose/A1c and edema._

---

**Standard baseline labs (all GH secretagogues):** IGF-1 and TSH/free T4 (gating — treat hypothyroidism first), fasting glucose/A1c, CMP, lipids. Exclude active malignancy. Titrate GHRH/GHRP agents to **upper-normal-for-age IGF-1**, not above. Re-dose calculator outputs whenever vial mg or BAC volume change.

---


# === Repair / Immune ===

# Peptide Dosing Protocols — Repair / Immunity Set

> **CLINICAL DISCLOSURE — READ FIRST.** Decision-support for LICENSED providers only. None of the five peptides below is FDA-approved for the indications described (Thymosin alpha-1 is marketed as **Zadaxin outside the US**, not FDA-approved domestically). All dosing is **empiric / community-protocol convention and is NOT clinically validated** — treat every regimen as **VERIFY** and confirm against current source/compounding pharmacy labeling, contraindication screen, and patient-specific factors before use. Reconstitution values are **calculator DEFAULTS** for a starting vial, not prescriptions. No citation has been fabricated; only DOIs already present in the MD-curated library are reproduced.

Source of record: `/home/user/renuviamd-site/protocols/protocols.json` (Tier-1, curated by Armando Falcon, MD; reviewed 2026-06-10). Frequency, rest/off period, and suggested recon standardized/extended below.

---

### BPC-157
- **Dose:** 250 mcg SC daily (typical); range **250–500 mcg/day**. **Route:** SC, local to injury preferred — **oral variants exist** (community-used for GI mucosal complaints; SC remains the standard for the protocol above). **Frequency:** once daily (may split BID at the higher end).
- **Cycle:** 4–6 weeks, then reassess and stop. **Rest:** off after the course (not continuous); re-course only if goal-bound and re-screened — cancer history is an absolute contraindication (pro-angiogenic).
- **Suggested recon (calculator default):** **5 mg vial + 2 mL BAC** → 2.5 mg/mL (2,500 mcg/mL); 250 mcg = 0.10 mL = 10 units (U-100).
- _Basis: empiric-VERIFY. No completed published human efficacy RCT (Phase 1 NCT02637284 status unknown; Phase 2 NCT07437547 recruiting). FDA barred from compounding (2023). Mechanistic/preclinical: Gwyer 2019 (doi:10.1007/s00441-019-03016-8); Seiwerth 2021 (doi:10.3389/fphar.2021.627533); Sikiric 2020 (doi:10.2174/1381612826666200424180139)._

---

### TB-500 (Thymosin beta-4 fragment)
- **Dose:** **2–2.5 mg SC twice weekly during loading**, then **2 mg SC once weekly maintenance**. **Route:** SC. **Frequency:** 2x/week loading → 1x/week maintenance (the standard loading/maintenance convention for this peptide).
- **Cycle:** ~6 weeks loading + 4–6 weeks maintenance. **Rest:** off after maintenance (not continuous); re-course only if re-screened — same absolute pro-angiogenic cancer contraindication.
- **Suggested recon (calculator default):** **10 mg vial + 2 mL BAC** → 5 mg/mL (5,000 mcg/mL); 2 mg = 0.40 mL = 40 units (U-100).
- _Basis: empiric-VERIFY. The consumer **fragment** "TB-500" has **no completed human efficacy trial** (NCT07487363 Ph1/2 recruiting); full-length Tβ4 (RGN-259) is a separate molecule with completed Phase 3 ophthalmic RCTs and should not be conflated. Doping-analytics literature only: Esposito 2012 (doi:10.1002/dta.1402); Ho 2012 (doi:10.1016/j.chroma.2012.09.043)._

---

### GHK-Cu (Copper tripeptide-1)
- **Dose:** **1–2 mg SC daily** (typical 2 mg) — or topical 1–2% serum. **Route:** SC or topical (note: strongest evidence is **topical**; systemic SC is empiric). **Frequency:** once daily.
- **Cycle:** 4–8 weeks. **Rest:** off after the course (not continuous); watch **cumulative copper** with chronic systemic dosing — check serum copper/ceruloplasmin if prolonged. Wilson disease / copper-overload and cancer history are contraindications.
- **Suggested recon (calculator default):** **50 mg vial + 5 mL BAC** → 10 mg/mL (10,000 mcg/mL); 2 mg = 0.20 mL = 20 units (U-100).
- _Basis: empiric-VERIFY (systemic). Mostly topical/cosmetic + in-vitro; a small post-laser topical RCT showed improved satisfaction but **no objective benefit**; Ph2 topical RCT recruiting (NCT07437586); no completed RCT for injected/systemic use. Miller 2006 (doi:10.1001/archfaci.8.4.252); Dymek 2023 (doi:10.3390/pharmaceutics15102485)._

---

### Thymosin alpha-1
- **Dose:** **1.6 mg SC twice weekly** (the conventional Zadaxin unit dose). **Route:** SC. **Frequency:** 2x/week.
- **Cycle:** 8–24 weeks, **indication-driven**. **Rest:** not a fixed off-period; titrate to lowest effective regimen by response (immune modulator, not a chronic "booster"). Transplant on immunosuppression is an absolute contraindication.
- **Suggested recon (calculator default):** **5 mg vial + 1 mL BAC** → 5 mg/mL (5,000 mcg/mL); 1.6 mg = 0.32 mL = 32 units (U-100).
- _Basis: empiric-VERIFY for US use — **marketed as Zadaxin in ~35 countries, NOT FDA-approved**. Real RCTs exist for *specific* indications (chronic hep B NCT00291616 / NCT02366208; melanoma adjuvant NCT00911443; pancreatitis TRACE; colorectal NCT05086614 recruiting) — robust there, NOT for "vitality/anti-aging." Ancell 2001 (doi:10.1093/ajhp/58.10.886); Zhou 2020 (doi:10.1136/bmjopen-2020-037231)._

---

### KPV
- **Dose:** **200–500 mcg SC daily** (or oral capsule). **Route:** SC or oral. **Frequency:** once daily.
- **Cycle:** 4–8 weeks. **Rest:** off after the course (not continuous); reassess inflammatory markers/symptoms before re-course. Caution in transplant/immunosuppression and severe active autoimmune disease.
- **Suggested recon (calculator default):** **5 mg vial + 2.5 mL BAC** → 2 mg/mL (2,000 mcg/mL); 500 mcg = 0.25 mL = 25 units (U-100).
- _Basis: empiric-VERIFY. **Preclinical only — zero human trials of any phase** (mouse colitis/IBD + in-vitro). Kannengiesser 2008 (doi:10.1002/ibd.20334); Viennois 2016 (doi:10.1016/j.jcmgh.2016.01.006); Xiao 2017 (doi:10.1016/j.ymthe.2016.11.020)._

---


# === Cognitive / Longevity ===

# Cognitive/Longevity Peptide Dosing Protocols (Adult)

> **Decision-support for LICENSED providers only.** Of the five peptides below, **only Cerebrolysin** has real randomized controlled trial dosing (and it is approved outside the US, not by the FDA). **Semax, Selank, DSIP, and Epitalon are NOT FDA-approved; their dosing is empiric / community-protocol and has NOT been clinically validated — treat every value below as a starting reference to be independently confirmed (VERIFY).** Reconstitution figures are calculator DEFAULTS, not prescriptions.

---

### Semax
- **Dose:** Intranasal: ~250-600 mcg/day (typical 300 mcg), often divided BID-TID (e.g., 1-2 drops/nostril of 0.1% solution). SC (empiric): 300 mcg/day; range 250-600 mcg (divide if higher). **Route:** Intranasal (conventional, Russia-marketed) AND SC (empiric — native peptide has a short half-life, so SC dosing is off-label/unvalidated; N-acetyl/amidated analogs are more SC-stable). **Frequency:** Daily (divided dosing common).
- **Cycle:** 2-4 weeks, pulsed. **Rest:** Off between pulses (not continuous); reassess before repeating.
- **Suggested recon (calculator default):** 10 mg vial + 2 mL BAC = 5 mg/mL (5,000 mcg/mL) -> 300 mcg = 0.06 mL = **6 units** (U-100). (Intranasal route typically uses a pre-formulated 0.1% nasal solution rather than SC reconstitution.)
- _Basis: empiric / community-protocol — **VERIFY**. Not FDA-approved; zero genuine registered trials. Best human data is a small non-randomized Russian acute-stroke study (Gusev 1997, PMID 11517472); remainder preclinical (Dolotov 2006, DOI 10.1111/j.1471-4159.2006.03658.x)._

---

### Selank
- **Dose:** Intranasal: ~250-500 mcg/day (typical 300 mcg), often divided (0.15% solution). SC (empiric): 300 mcg/day; range 250-500 mcg (divide if higher). **Route:** Intranasal (conventional, Russia-marketed) AND SC (empiric — native Selank has a short half-life; SC dosing here is unvalidated; N-acetyl/amidated analogs are more SC-stable). **Frequency:** Daily (divided dosing common).
- **Cycle:** 2-4 weeks, pulsed. **Rest:** Off between pulses (not continuous); reassess before repeating.
- **Suggested recon (calculator default):** 10 mg vial + 2 mL BAC = 5 mg/mL (5,000 mcg/mL) -> 300 mcg = 0.06 mL = **6 units** (U-100). (Intranasal route typically uses a pre-formulated 0.15% nasal solution rather than SC reconstitution.)
- _Basis: empiric / community-protocol — **VERIFY**. Not FDA-approved; zero genuine registered trials. Two small Russian comparative anxiety trials vs benzodiazepines (Zozulia 2008, PMID 18454096; Medvedev 2014, PMID 25176261) + preclinical (Kasian 2017, DOI 10.1155/2017/5091027)._

---

### Cerebrolysin
- **Dose:** Typical 10 mL/day; range 5-30 mL/day (post-stroke/TBI RCT courses commonly 30 mL/day; cognitive/lower-acuity use 5-10 mL/day). **Route:** IM for volumes up to 5 mL; slow IV infusion (diluted in saline over ~15-60 min) for larger volumes. **Frequency:** Once daily for the duration of the course.
- **Cycle:** 10-20 consecutive days per course (RCTs commonly 10-21 days). **Rest:** Course-based, not continuous; repeat 2-4x/year as indicated.
- **Suggested recon (calculator default):** **Pre-made ampoule solution (215.2 mg/mL) — no reconstitution / n/a.** (Larger IV doses are diluted into a saline carrier per label, not reconstituted from powder.)
- _Basis: Real RCT dosing. Post-stroke CARS RCT (Muresanu 2016, Stroke, DOI 10.1161/STROKEAHA.115.009416); Alzheimer's meta-analysis (Gauthier 2015, DOI 10.1159/000377672). Note evidence is MIXED — a stroke meta-analysis (Zhang 2017, DOI 10.1155/2017/4191670) found no significant efficacy. Approved in several non-US countries; NOT FDA-approved._

---

### DSIP (Delta Sleep-Inducing Peptide)
- **Dose:** Typical 200 mcg; range 100-300 mcg at bedtime. **Route:** SC. **Frequency:** Once at bedtime (nightly or as needed).
- **Cycle:** 4-6 weeks. **Rest:** Off after the cycle (not continuous); reassess before resuming.
- **Suggested recon (calculator default):** 5 mg vial + 2 mL BAC = 2.5 mg/mL (2,500 mcg/mL) -> 200 mcg = 0.08 mL = **8 units** (U-100).
- _Basis: empiric / community-protocol — **VERIFY**. Not FDA-approved; zero registered trials. Old, sparse, inconclusive human data; reviewers note DSIP does not reliably promote sleep (Graf & Kastin 1986, DOI 10.1016/0196-9781(86)90148-8; Kovalzon & Strekalova 2006, DOI 10.1111/j.1471-4159.2006.03693.x)._

---

### Epitalon (Epithalon)
- **Dose:** Typical 5-10 mg/day; range 5-10 mg. **Route:** SC. **Frequency:** Once daily for each pulse.
- **Cycle:** **10-20 day pulse** (the conventional dosing convention — short pulsed courses, NOT chronic). **Rest:** Off between pulses; repeat the pulse 1-2x/year as indicated (not continuous).
- **Suggested recon (calculator default):** 10 mg vial + 1 mL BAC = 10 mg/mL (10,000 mcg/mL) -> 10 mg = 1.0 mL = **100 units** (U-100). (For a 5 mg dose: 0.5 mL = 50 units.)
- _Basis: empiric / community-protocol — **VERIFY**. Not FDA-approved; zero registered trials. Telomerase/longevity claims rest on in-vitro + animal + weak older Russian reports with no Western replication (Khavinson 2003, DOI 10.1023/a:1025493705728; Khavinson 2002, PMID 12374906  *[audit removed a mismatched Anisimov DOI that resolved to an unrelated paper]*)._

---

**Standardization notes vs. protocols.json:** Existing `body_md` Dose/Route/Cycle/recon values were verified and retained. Extensions added per task rules: (1) Semax & Selank now show BOTH the conventional intranasal route and the empiric SC route (the file's own NOTE flags intranasal as conventional and SC as empiric due to short native half-life); (2) explicit empiric/VERIFY flags and the not-FDA-approved status surfaced for Semax/Selank/DSIP/Epitalon; (3) Cerebrolysin's real RCT DOIs cited and "pre-made solution — no reconstitution" emphasized; (4) Epitalon's 10-20 day pulse convention called out explicitly. No citations were fabricated; all DOIs/PMIDs are drawn from the protocol library's existing citation lists.

---


# === Sexual / Hormonal ===

# Sexual / Reproductive-Axis Peptide Dosing Protocols (Adult)

> Decision-support for LICENSED providers (AllyOS). Doses below are standardized from the RenuviaMD protocol library (`protocols/protocols.json`), extended and verified. Only PT-141 has an FDA-LABEL dose; the others are empiric / community-protocol and are flagged **VERIFY**. Recon values are calculator DEFAULTS, not prescriptions.

---

### PT-141 (Bremelanotide / Vyleesi)
- **Dose:** 1.75 mg (FDA-label, fixed) **Route:** SC (abdomen/thigh) **Frequency:** PRN, inject >=45 min before anticipated sexual activity; **max 1 dose / 24 h and <=8 doses / month** (label caps)
- **Cycle:** PRN / continuous episodic use; reassess benefit at ~8 weeks and discontinue if no improvement **Rest:** none scheduled; the 1/24h + 8/month caps ARE the throttle
- **Suggested recon (calculator default):** Vyleesi autoinjector is **pre-filled 1.75 mg / 0.3 mL — no reconstitution**. Compounded default: **10 mg vial + 5 mL BAC** = 2 mg/mL -> 1.75 mg = 0.875 mL (~88 units U-100). VERIFY compounded concentration against the pharmacy's actual fill.
- _Basis: FDA label (Vyleesi, approved 2019, acquired/generalized HSDD in premenopausal women); 1.75 mg SC PRN, max 1/24h and 8/month is the labeled regimen. Male / general-libido / ED use is OFF-LABEL. Gate on controlled BP (contraindicated in uncontrolled HTN / significant CVD)._

---

### Kisspeptin-10
- **Dose:** ~100 mcg SC typical (empiric); range narrow — **start low** (~50–100 mcg). No validated SC dose-range exists. **Route:** SC **Frequency:** empiric — commonly once daily or a few times weekly; **NOT established** (genuine human data is acute IV physiology dosing, not chronic SC)
- **Cycle:** 4–8 weeks empiric, tied to response **Rest:** off-cycle between courses (community practice; not validated)
- **Suggested recon (calculator default):** **5 mg vial + 2.5 mL BAC** = 2 mg/mL (2,000 mcg/mL) -> 100 mcg = 0.05 mL = **5 units** (U-100)
- _Basis: EMPIRIC / community-protocol — **NOT validated. VERIFY.** Not FDA-approved (investigational). Human Phase 1 studies confirm it acutely raises LH, but there are no completed efficacy RCTs for libido/fertility/"vitality" and no validated SC regimen. Screen for hormone-sensitive malignancy; consent as experimental._

---

### Gonadorelin
- **Dose (male TRT/HPG-axis support, empiric):** ~100–200 mcg SC per pulse; common community range 100–500 mcg. **Route:** SC (pulsatile physiology; classic ovulation-induction protocols use an IV/SC pump). **Frequency:** TRT-support is typically given as repeated small SC doses — e.g. **EOD or 2–3x/week**, some protocols daily or twice-weekly, to mimic pulsatile GnRH and maintain testicular function/intratesticular testosterone on TRT.
  - **Female ovulation induction (the evidence-backed use):** pulsatile delivery ~5–20 mcg IV every 60–90 min via pump — distinct indication, distinct dosing.
- **Cycle:** protocol-dependent; for TRT support, continuous alongside testosterone therapy **Rest:** none scheduled for TRT support (tied to the TRT course)
- **Suggested recon (calculator default):** **10 mg vial + 5 mL BAC** = 2 mg/mL (2,000 mcg/mL) -> 100 mcg = 0.05 mL = **5 units** (U-100). (Smaller vials, e.g. 2 mg + 2 mL = 1 mg/mL -> 100 mcg = 10 units, are also common — match to the pharmacy fill.)
- _Basis: Brand GnRH products (Factrel, Lutrepulse) **discontinued — only US availability is compounded.** Female pulsatile ovulation-induction dosing has real evidence; **male TRT-adjunct dosing is OFF-LABEL, empiric, with limited modern data — VERIFY.** Pulsatile delivery matters physiologically. Rule out hormone-sensitive malignancy and pituitary adenoma._

---

### Melanotan II
- **Dose (reported / gray-market — NOT a recommended protocol):**
  - **Loading:** start LOW — ~**0.25 mg (250 mcg) SC daily**, titrating cautiously upward (e.g. toward ~0.5–1 mg/day) only as tolerated, until desired pigmentation. The low starting dose is **important to limit nausea, flushing, and priapism**, which are dose-related and common.
  - **Maintenance:** after desired tan is reached, reduce to ~**1 mg SC 1–2x/week** (community practice).
- **Route:** SC **Frequency:** loading daily (low dose) -> maintenance ~weekly–twice weekly
- **Cycle:** N/A — gray-market; no validated cycle **Rest:** off between loading phases (community practice)
- **Suggested recon (calculator default):** **10 mg vial + 5 mL BAC** = 2 mg/mL (2,000 mcg/mL) -> 250 mcg (starting dose) = 0.125 mL = **12.5 units** (U-100); 1 mg = 0.5 mL = 50 units. NOTE: gray-market potency/purity is unreliable (forensic analyses have found ~30% purity) — recon math assumes label content that may not be real.
- _Basis: EMPIRIC / gray-market — **NOT validated. VERIFY.** **Not FDA-approved for any use** and distinct from FDA-approved afamelanotide (SCENESSE). Safety signal: case reports of melanoma and new/changing or darkening moles after use; nausea, flushing, and spontaneous erections (priapism) are common — hence the mandatory low start and titration. Absolute contraindication: personal/family melanoma or atypical/dysplastic nevi. Mandate full-body skin surveillance; many clinicians decline to prescribe._

---

**Standing caveats:** All non-PT-141 doses here are empiric/community-derived and not efficacy-validated — flagged **VERIFY**. Confirm vial mg and BAC volume against the actual compounding-pharmacy fill before applying recon math. Document contraindication screening and obtain experimental/off-label consent where applicable.

---
