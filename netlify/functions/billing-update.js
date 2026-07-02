// AllyOS billing — change an EXISTING subscription in place (add / drop / swap lines),
// server-to-server, NO Stripe redirect. The card already on file is used; Stripe prorates.
// POST { clinic_id, lines: ["iv","peptides","bhrt"] }  ->  { ok, quantity, monthly, changed }.
// The FIRST subscription is still created by billing-checkout (needs a card); after that,
// every up/down/swap comes through here. PHI-free.
// Secrets (Netlify env): STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// (Self-contained — no shared module. Mirrors billing-checkout's patterns.)

const STRIPE_VERSION = "2024-06-20";
const BUNDLE = { 0: 0, 1: 199, 2: 349, 3: 499 };
const VALID_LINES = ["iv", "peptides", "bhrt"];

function form(obj, prefix) {
  const parts = [];
  Object.keys(obj).forEach((k) => {
    const v = obj[k]; if (v === undefined || v === null) return;
    const key = prefix ? prefix + "[" + k + "]" : k;
    if (Array.isArray(v)) v.forEach((it, i) => { if (it && typeof it === "object") parts.push(form(it, key + "[" + i + "]")); else parts.push(encodeURIComponent(key + "[" + i + "]") + "=" + encodeURIComponent(it)); });
    else if (v && typeof v === "object") parts.push(form(v, key));
    else parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(v));
  });
  return parts.filter(Boolean).join("&");
}
async function stripePost(path, params, secret) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": STRIPE_VERSION },
    body: form(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe " + path + ": " + ((data.error && data.error.message) || res.status));
  return data;
}
async function stripeGet(path, secret) {
  const res = await fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + secret, "Stripe-Version": STRIPE_VERSION } });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe GET " + path + ": " + ((data.error && data.error.message) || res.status));
  return data;
}
function sbHeaders() { const k = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" }; }
function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
async function sbGet(query) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { headers: sbHeaders() }); return res.ok ? res.json() : []; }
async function sbPatch(query, body) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { method: "PATCH", headers: Object.assign(sbHeaders(), { Prefer: "return=minimal" }), body: JSON.stringify(body) }); return res.ok; }
function parseBody(event) { try { return JSON.parse((event && event.body) || "{}"); } catch (e) { return {}; } }
function json(statusCode, obj) { return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "not_configured" });

  const body = parseBody(event);
  const clinicId = body.clinic_id;
  if (!clinicId) return json(400, { error: "clinic_id required" });

  // Normalize the requested active-line set (de-dupe, validate, order).
  const requested = Array.isArray(body.lines) ? body.lines : [];
  const lines = VALID_LINES.filter((k) => requested.indexOf(k) >= 0);
  if (lines.length < 1) return json(400, { error: "min_one_line", hint: "Keep at least one line. To stop entirely, cancel under Manage plan." });
  const newQty = Math.max(1, Math.min(3, lines.length));

  try {
    const rows = await sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=id,stripe_subscription_id,subscription_status,lines,lines_entitled");
    const clinic = rows[0];
    if (!clinic) return json(404, { error: "clinic_not_found" });

    const subId = clinic.stripe_subscription_id;
    // No subscription yet → the client must run first-time checkout (collects a card).
    if (!subId) return json(200, { ok: false, needs_checkout: true, quantity: newQty, monthly: BUNDLE[newQty] });

    // Read the live subscription to get the item id + current quantity (source of truth).
    const sub = await stripeGet("subscriptions/" + encodeURIComponent(subId), key);
    const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
    const curQty = item.quantity || 1;

    let changed = false;
    if (item.id && newQty !== curQty) {
      // In-place quantity change on the SAME subscription — never a new one. Stripe prorates
      // onto the next invoice (charge if adding, credit if dropping); the card on file is used.
      await stripePost("subscriptions/" + encodeURIComponent(subId), {
        items: [{ id: item.id, quantity: newQty }],
        proration_behavior: "create_prorations",
      }, key);
      changed = true;
    }

    // Reflect the new active/entitled lines in the clinic record (access gates read these).
    // subscription_status + current_period_end are re-synced authoritatively by the webhook.
    await sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), {
      lines: lines,
      lines_entitled: lines,
      plan: newQty + "-line",
      billing_updated_at: new Date().toISOString(),
    });

    return json(200, {
      ok: true,
      changed: changed,
      quantity: newQty,
      previous_quantity: curQty,
      lines: lines,
      monthly: BUNDLE[newQty],
      direction: newQty > curQty ? "upgrade" : (newQty < curQty ? "downgrade" : "swap"),
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    });
  } catch (e) {
    return json(502, { error: "update_failed", detail: String(e).slice(0, 200) });
  }
};
