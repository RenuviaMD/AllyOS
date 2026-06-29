# AllyOS billing — Stripe integration plan (for review, not yet built)

> Status: **PLAN ONLY.** No keys, no checkout, no charges wired. This is the design to approve before any build. Dollar amounts are **never** committed (public repo) — they live in the Stripe dashboard; the app references **price IDs** only.

## 1. What you're selling (recap of your model)
You sell **structure + Ally** (the platform), per clinic. The MD-of-record service is a **separate** agreement, **not** billed through this Stripe. Your existing ladder:

- **Protocol Pack** — one-time, per line (IV / Peptides / BHRT). "Buy the knowledge." The curated reference, unsigned templates.
- **AllyOS Live** — monthly subscription, per clinic. "Run the operation." Protocols **+ Ally + workflows + cloud sync + the MD cockpit feed.**

Recommended Stripe shape: **per-clinic subscription** for AllyOS Live (core revenue) + optional **one-time** Protocol Pack purchases. Per-seat can be layered later via Stripe quantities if you want.

## 2. Stripe products & prices (you set amounts in the dashboard)
| Product | Type | Price ID (env) | Notes |
|---|---|---|---|
| AllyOS Live — clinic | recurring/month | `PRICE_ALLYOS_LIVE` | The platform subscription. Optional `quantity` = seats. |
| Protocol Pack — IV | one-time | `PRICE_PACK_IV` | "Buy the knowledge" |
| Protocol Pack — Peptides | one-time | `PRICE_PACK_PEPTIDES` | |
| Protocol Pack — BHRT | one-time | `PRICE_PACK_BHRT` | |
| (optional) Extra seat | recurring/month | `PRICE_SEAT` | If you want per-seat add-ons |

Start in **test mode**. Use **Stripe Tax** for sales tax, and a **free trial** (e.g. 14 days) if you want — both dashboard toggles.

## 3. Architecture (least PCI burden)
- **Stripe Checkout (hosted)** — we never touch card data. A Netlify function creates a Checkout Session; Stripe hosts the payment page.
- **Customer Portal (hosted)** — clinics self-serve upgrades/cancel/payment-method. One function creates a portal link.
- **Webhook** — a Netlify function receives subscription lifecycle events and writes status to Supabase.

```
netlify/functions/
  billing-checkout.js   → POST {clinic_id, price_id} → Stripe Checkout Session URL
  billing-portal.js     → POST {clinic_id} → Customer Portal URL
  billing-webhook.js    → Stripe events → update Supabase clinics.subscription_*
```

Secrets (Netlify env only, never committed): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the `PRICE_*` ids. Publishable key (`pk_...`) is fine client-side.

## 4. Data model (extend Supabase `clinics`)
Add billing columns (migration, when approved):
```
stripe_customer_id   text
subscription_status  text   -- trialing | active | past_due | canceled | none
plan                 text   -- e.g. 'allyos_live'
lines_entitled       text[] -- which lines this clinic has paid for
current_period_end   timestamptz
```
The webhook updates these. RLS already scopes `clinics` per tenant; billing fields are write-only by the webhook (service role), read by the clinic/MD.

## 5. Feature gating (ties into what already exists)
The dashboard already has **locked-line module cards** and per-line activation. Today they're demo-unlockable; with billing they read `clinics.subscription_status` + `lines_entitled`:
- `active`/`trialing` + line entitled → unlocked.
- otherwise → the existing "Add this line" upsell card → **billing-checkout** → Stripe → webhook → unlocked.
The MD cockpit and cloud sync gate on an active subscription too.

## 6. End-to-end flow
1. Clinic clicks "Activate IV line" → `billing-checkout({clinic_id, price_id})` → redirected to Stripe Checkout.
2. Pays → Stripe fires `checkout.session.completed` / `customer.subscription.updated` → `billing-webhook` verifies signature → updates `clinics`.
3. App re-reads entitlement → line unlocks. "Manage billing" → `billing-portal` → Stripe portal.

## 7. What stays OUT of this Stripe
- **MD-of-record fees** — your separate medical-director business ("each MD has a book"). Bill those however you already do; not in AllyOS Stripe.
- **PHI / patient billing** — AllyOS never bills patients; clinics bill their own patients in their own systems.

## 8. Decisions needed from you (before build)
1. **Amounts + trial** — set per price in the Stripe dashboard (I won't see/commit them).
2. **Per-clinic flat vs per-seat** — recommend starting **per-clinic flat**, add seats later.
3. **Which lines are paid vs included** — e.g. IV included, Peptides/BHRT add-ons? Or all-in-one?
4. **Stripe account** — confirm you have one (or create), and whether to start in **test mode** (recommended) first.
5. **Tax/Portal** — enable Stripe Tax? Enable Customer Portal self-serve?

## 9. Build order (once approved)
1. Supabase billing columns migration.
2. `billing-checkout` + `billing-portal` + `billing-webhook` functions (test mode).
3. Wire the dashboard locked-line cards → checkout; "Manage billing" link.
4. Entitlement read in dashboard/cockpit.
5. Test full loop with Stripe test cards → then flip to live keys.

---

## 10. Pricing reconciliation — SETTLE THIS FIRST (code audit, 2026-06-29)

Before wiring Stripe we have to pick **one** billing unit, because the codebase currently states the price three different ways. This is the single decision that unblocks everything else — the Stripe Product/Price objects can't be created until it's made.

**What the code says today (three sources, not aligned):**
| Source | What it charges | Implication |
|---|---|---|
| `allyos/pricing.html` (Platform tier) | **$199/mo per *location*** — all lines included; unlimited nurse seats; **+ per authorizing-provider seat** add-on | Flat per clinic; lines are *not* metered |
| `allyos/clinic-network.html` cockpit MRR | **$199/mo × number of *active lines*** (IV+PEP+BHRT ⇒ up to $597/clinic) | Per-line metered |
| `allyos/dashboard.html` / `onboard.html` | "$199/mo **per line** … bundle all three for less" | Per-line, with an unspecified bundle discount |

So a 3-line clinic is **$199** (pricing.html) vs **$597** (cockpit) vs "$597 minus a bundle discount" (dashboard). These can't all ship.

**The decision (pick one):**
- **A — Per location, flat $199** (matches pricing.html). Simplest Stripe: one recurring Price, `quantity = 1` per clinic. Lines become free entitlements you toggle in the cockpit. Cockpit MRR math changes to `clinics × 199` (not × lines).
- **B — Per active line $199** (matches the cockpit today). Stripe: one recurring Price, `quantity = #active lines`. Clean metering, higher ARPU, but contradicts the public pricing page.
- **C — Per location + bundle tiers** (matches the dashboard hint). e.g. 1 line $199 / 2 lines $349 / 3 lines $499. Stripe: three Prices or a tiered Price. Most marketing-friendly, most config.

**Recommendation: A (flat per location).** It's what the public pricing page already promises, it's the least surprising to a clinic, and it makes the §400.9935 story clean (you sell *the platform per site*; the authorizing-provider seat is the only metered unit — and that maps to the MD-of-record tier, which §7 already keeps OUT of this Stripe). If you want more ARPU later, add the provider-seat add-on as a second Price — no re-architecture.

**Second decision — the authorizing-provider seat.** pricing.html sells "+ per authorizing provider (MD/DO/NP/PA who signs GFEs)" as a license-bound seat. Is that:
- (i) **folded into the MD-of-record agreement** (off-Stripe, per §7) — simplest, **recommended**; or
- (ii) a **metered Stripe add-on** Price for clinics that bring their own provider but want extra signer seats?

**If A is chosen, two small code follow-ups (I can do when you're back):**
1. Cockpit MRR → `clinics.length × 199` and the per-clinic card shows "$199/mo" flat (drop the `× lines` math in `mrrOf`).
2. `pricing.html` DRAFT banner can come off once amounts are final.

**Everything in §1–§9 still holds** regardless of A/B/C — only the Product/Price object count and the `mrrOf` calculation change. Bring: (1) A/B/C choice, (2) provider-seat i/ii choice, (3) the actual dollar amounts (set in the Stripe dashboard, never committed), (4) confirm Stripe account + test mode.
