# AllyOS — Stripe Go-Live Checklist (test → live)

Going live is a **6-step test→live swap**, not a dashboard toggle. The current keys/price/webhook are all
**test-mode**; if you flip Stripe to live without swapping them, checkout breaks (the test `price_...` doesn't exist
in live). Do the two pre-checks first, then the six steps.

> ⚠️ Never paste `sk_live_…` or `whsec_…` values into chat or commit them. They go straight into Netlify env vars.

---

## How billing charges (so you build the live price right)
Checkout sends `quantity = # of active lines (1–3)` against **one volume-tiered price**. Replicate the tier structure
exactly or the amounts are wrong (a flat "$199 each" would bill $597 for 3 lines):

| Lines (quantity) | Charge |
|---|---|
| 1 | $199 |
| 2 | $349 |
| 3 | $499 |

In Stripe: a **volume** price with **flat-amount tiers**, billed **monthly** — up-to-1 → $199, up-to-2 → $349,
up-to-3 → $499.

Env vars the functions read: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLATFORM`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. (Supabase + SITE_URL are not Stripe-mode-specific.)

---

## Pre-checks (do BEFORE going live)
- [ ] **A test-mode checkout has succeeded end-to-end** at least once: Checkout → `checkout.session.completed`
      webhook → Supabase clinic marked active → dashboard reflects it. If this has never worked in TEST, fix it in
      test first — going live on an unverified flow risks charging real cards while the subscription state doesn't record.
- [ ] **Netlify production build is green** for the latest `main` — the three billing functions
      (`billing-checkout`, `billing-portal`, `billing-webhook`) must be deployed. If the last build failed, none of
      this runs.

---

## The 6 steps
1. [ ] **Activate the Stripe account for live payments** (business details + bank/payout verified) if not already.
2. [ ] **Live mode → recreate** the product + the **volume-tiered price** above (flat tiers 199/349/499, recurring
       monthly). Copy the new **live** `price_…` ID.
3. [ ] **Live API key**: Developers → API keys (live mode) → copy the **live secret key** (`sk_live_…`).
4. [ ] **Live webhook**: create an endpoint at `https://<your-prod-domain>/.netlify/functions/billing-webhook`,
       subscribe to `checkout.session.completed` + `customer.subscription.*`. Copy the **live** signing secret (`whsec_…`).
5. [ ] **Netlify → Site config → Environment variables**: set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLATFORM`,
       `STRIPE_WEBHOOK_SECRET` to the **live** values; confirm `SITE_URL` = production. **Trigger a redeploy** so the
       functions pick up the new env.
6. [ ] **One real end-to-end test**: subscribe a clinic with your own card → confirm Stripe shows the right amount →
       webhook fires → Supabase marks the clinic active → dashboard reflects it → **refund yourself**. Then you're live.

---

## Notes
- **MD-of-record stays external** (your decision): Stripe here only bills the $199/$349/$499 platform, never the
  $2,000 supervision floor (handled at myFloridaMedicalDirector.com).
- Test and live are fully separate ledgers — test customers/subscriptions do not appear in live.
- After go-live, keep a test-mode price around for future QA without touching live.
