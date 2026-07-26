# AllyOS Laser Hair Removal — change record

`allyos/laser.html` · storage key `allyos_hairremoval_v1` · single-suite, PHI-on-device (no server, no BAA).

## Laser-only + consent gate + GFE wording (PR #192)
1. **Laser-only is the permanent default.** `LASER_ONLY` defaults true; electrolysis is hidden from
   the GFE approval + treatment and de-advertised in the title/disclaimer. Dormant — re-enable only
   with `?electro=1`. (The supervising physician does not oversee electrolysis, so the platform
   doesn't present or gate it.)
2. **Treatment gated on signed consent.** `recordConsent(id)` + a consent status/button in the client
   view; `onTreatClient` blocks the treatment form until consent is on file.
3. **GFE signature wording** → "GFE (records review / telehealth as applicable)". Keeps
   **NPI 1447295126 · FL ME 84789**.
4. **Demo seed** is a laser session (`electro:[]`) so the sample matches laser-only.
5. **Title** → "AllyOS Laser Hair Removal"; disclaimer drops the electrolysis mention.

**Do NOT change:** the wavelength↔Fitzpatrick guardrail (755 = I–II, 810 = III–IV, 1064 = V–VI only)
or the GFE gate — those are correct.

## Modes
- default → laser-only, electrologist (tech) view
- `?role=md` → physician view (GFE approval, telehealth escalation)
- `?intake=1` → client self-intake questionnaire
- `?demo=1` → sample data, nothing saved
- `?electro=1` → re-enable dormant electrolysis modality

## Business-doc set (RenuviaMD-Laser-Suite, kept outside the app)
The Fee & Scope Sheet, Supervision Agreement, Standing Order, Informed Consent, GFE Clearance,
Client Intake, Treatment Record, Aftercare, Incident Report, and Oversight/Device Log are the
audit-ready paperwork the physician files and the suite keeps on site. The **app** carries only the
daily clinical workflow (intake → GFE → consent → treatment log) — supervision/standing-order/chart-review
scaffolding lives in those documents, not in the UI. Locked terms: $500→$750/mo, GFE $35 (valid 1 yr,
pass-through), platform included, setup waived, laser-only, telehealth within 150 mi, protocol filed
with the FL Electrolysis Council (Rule 64B8-56.002 F.A.C.).
