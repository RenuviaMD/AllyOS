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
