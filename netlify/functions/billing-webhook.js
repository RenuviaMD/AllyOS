// AllyOS billing — Stripe webhook. Verifies the signature and syncs subscription state
// into Supabase clinics.*  (the ONLY writer of billing fields; uses the service role).
// Secrets (Netlify env): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. (Self-contained — no shared module.)
const crypto = require("crypto");

const STRIPE_VERSION = "2024-06-20";
async function stripeGet(path, secret) {
  const res = await fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + secret, "Stripe-Version": STRIPE_VERSION } });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe GET " + path + ": " + res.status);
  return data;
}
function verifySignature(rawBody, sigHeader, secret, toleranceSec) {
  if (!sigHeader || !secret) return false;
  const parts = {};
  sigHeader.split(",").forEach((kv) => { const i = kv.indexOf("="); if (i > 0 && !(kv.slice(0, i) in parts)) parts[kv.slice(0, i)] = kv.slice(i + 1); });
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = crypto.createHmac("sha256", secret).update(t + "." + rawBody, "utf8").digest("hex");
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1)); } catch (e) { ok = false; }
  if (ok && toleranceSec) { const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10)); if (age > toleranceSec) return false; }
  return ok;
}
function sbHeaders() { const k = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" }; }
function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
async function sbGet(query) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { headers: sbHeaders() }); return res.ok ? res.json() : []; }
async function sbPatch(query, body) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { method: "PATCH", headers: Object.assign(sbHeaders(), { Prefer: "return=minimal" }), body: JSON.stringify(body) }); return res.ok; }

async function applySub(clinicId, sub) {
  if (!clinicId || !sub) return;
  const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
  const cpe = sub.current_period_end || item.current_period_end || null;
  // The Medical-Director-of-record fee is a SEPARATE product/lane — route it to md_* fields
  // so it never overwrites the AllyOS line subscription (a customer can hold both).
  if (sub.metadata && sub.metadata.type === "md_of_record") {
    await sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), {
      md_subscription_id: sub.id,
      md_subscription_status: sub.status || "none",
      stripe_customer_id: sub.customer,
      billing_updated_at: new Date().toISOString(),
    });
    return;
  }
  await sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), {
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
  if (sub.customer) { const rows = await sbGet("clinics?stripe_customer_id=eq." + encodeURIComponent(sub.customer) + "&select=id"); if (rows[0]) return rows[0].id; }
  return null;
}
async function handle(evt, key) {
  const o = evt.data && evt.data.object;
  switch (evt.type) {
    case "checkout.session.completed": {
      const clinicId = o.client_reference_id || (o.metadata && o.metadata.clinic_id);
      if (o.subscription && clinicId) { const sub = await stripeGet("subscriptions/" + o.subscription, key); await applySub(clinicId, sub); }
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
      if (o.subscription) { const sub = await stripeGet("subscriptions/" + o.subscription, key); const clinicId = await clinicIdForSub(sub); if (clinicId) await applySub(clinicId, sub); }
      break;
    }
    default: break;
  }
}

exports.handler = async (event) => {
  const key = process.env.STRIPE_SECRET_KEY, wsecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !wsecret) return { statusCode: 503, body: "not_configured" };
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "");
  const sig = (event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"])) || "";
  if (!verifySignature(raw, sig, wsecret, 300)) return { statusCode: 400, body: "invalid signature" };
  let evt; try { evt = JSON.parse(raw); } catch (e) { return { statusCode: 400, body: "invalid json" }; }
  try { await handle(evt, key); } catch (e) { return { statusCode: 500, body: "handler error" }; }
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
