// AllyOS billing — Stripe webhook. Verifies the signature and syncs subscription state
// into Supabase clinics.*  (the ONLY writer of billing fields; uses the service role).
// Secrets (Netlify env): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Configure the endpoint in Stripe -> Developers -> Webhooks.
const B = require("./lib/billing");

async function applySub(clinicId, sub) {
  if (!clinicId || !sub) return;
  const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
  // current_period_end lives on the subscription (older API) OR on the item (2025+ API versions)
  const cpe = sub.current_period_end || item.current_period_end || null;
  await B.sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), {
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    subscription_status: sub.status || "none",
    plan: (item.quantity || 1) + "-line",
    current_period_end: cpe ? new Date(cpe * 1000).toISOString() : null,
    billing_updated_at: new Date().toISOString(),
  });
}

async function clinicIdForSub(sub) {
  if (sub.metadata && sub.metadata.clinic_id) return sub.metadata.clinic_id;
  if (sub.customer) {
    const rows = await B.sbGet("clinics?stripe_customer_id=eq." + encodeURIComponent(sub.customer) + "&select=id");
    if (rows[0]) return rows[0].id;
  }
  return null;
}

async function handle(evt, key) {
  const o = evt.data && evt.data.object;
  switch (evt.type) {
    case "checkout.session.completed": {
      const clinicId = o.client_reference_id || (o.metadata && o.metadata.clinic_id);
      if (o.subscription && clinicId) { const sub = await B.stripeGet("subscriptions/" + o.subscription, key); await applySub(clinicId, sub); }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const clinicId = await clinicIdForSub(o);
      if (clinicId) await applySub(clinicId, o);
      break;
    }
    case "invoice.payment_failed": {
      if (o.subscription) { const sub = await B.stripeGet("subscriptions/" + o.subscription, key); const clinicId = await clinicIdForSub(sub); if (clinicId) await applySub(clinicId, sub); }
      break;
    }
    default: break; // ignore everything else
  }
}

exports.handler = async (event) => {
  const key = process.env.STRIPE_SECRET_KEY, wsecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !wsecret) return { statusCode: 503, body: "not_configured" };
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "");
  const sig = (event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"])) || "";
  if (!B.verifySignature(raw, sig, wsecret, 300)) return { statusCode: 400, body: "invalid signature" };
  let evt; try { evt = JSON.parse(raw); } catch (e) { return { statusCode: 400, body: "invalid json" }; }
  try { await handle(evt, key); } catch (e) { return { statusCode: 500, body: "handler error" }; }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
