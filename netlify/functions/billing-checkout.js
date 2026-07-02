// AllyOS billing — create a Stripe Checkout Session for the platform subscription.
// POST { clinic_id, quantity? }  ->  { url }.  quantity = # active lines (1..3); the
// volume-tiered Price charges the bundle (1=$199, 2=$349, 3=$499). PHI-free.
// Secrets (Netlify env): STRIPE_SECRET_KEY, STRIPE_PRICE_PLATFORM, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Optional: SITE_URL. (Self-contained — no shared module.)

const { requireClinic } = require("./lib/auth");
const STRIPE_VERSION = "2024-06-20";
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
async function stripe(path, params, secret, idemKey) {
  const headers = { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": STRIPE_VERSION };
  if (idemKey) headers["Idempotency-Key"] = idemKey;
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: headers,
    body: form(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe " + path + ": " + ((data.error && data.error.message) || res.status));
  return data;
}
function sbHeaders() { const k = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" }; }
function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
async function sbGet(query) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { headers: sbHeaders() }); return res.ok ? res.json() : []; }
async function sbPatch(query, body) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { method: "PATCH", headers: Object.assign(sbHeaders(), { Prefer: "return=minimal" }), body: JSON.stringify(body) }); return res.ok; }
function parseBody(event) { try { return JSON.parse((event && event.body) || "{}"); } catch (e) { return {}; } }
function siteOf(event) { if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, ""); const h = (event && event.headers) || {}; if (h.origin) return h.origin; if (h.host) return "https://" + h.host; return ""; }
function json(statusCode, obj) { return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  const key = process.env.STRIPE_SECRET_KEY, price = process.env.STRIPE_PRICE_PLATFORM;
  if (!key || !price) return json(503, { error: "not_configured" });

  const body = parseBody(event);
  const clinicId = body.clinic_id;
  if (!clinicId) return json(400, { error: "clinic_id required" });
  const gate = await requireClinic(event, clinicId); if (gate.error) return gate.error;
  let qty = parseInt(body.quantity, 10);

  try {
    const rows = await sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=id,name,stripe_customer_id,lines");
    const clinic = rows[0];
    if (!clinic) return json(404, { error: "clinic_not_found" });
    if (!(qty >= 1 && qty <= 3)) qty = Math.max(1, Math.min(3, (clinic.lines || []).length || 1));

    let customer = clinic.stripe_customer_id;
    if (!customer) {
      // clinic_id-derived idempotency key + null-guarded write: concurrent requests converge
      // on ONE Stripe customer instead of clobbering each other's id.
      const c = await stripe("customers", { name: clinic.name || "AllyOS clinic", metadata: { clinic_id: clinicId } }, key, "cust-" + clinicId);
      customer = c.id;
      await sbPatch("clinics?id=eq." + encodeURIComponent(clinicId) + "&stripe_customer_id=is.null", { stripe_customer_id: customer });
    }

    const site = siteOf(event);
    const session = await stripe("checkout/sessions", {
      mode: "subscription",
      customer: customer,
      line_items: [{ price: price, quantity: qty }],
      client_reference_id: clinicId,
      subscription_data: { metadata: { clinic_id: clinicId } },
      allow_promotion_codes: true,
      success_url: site + "/allyos/dashboard.html?billing=success",
      cancel_url: site + "/allyos/dashboard.html?billing=cancel",
    }, key);
    return json(200, { url: session.url });
  } catch (e) {
    return json(502, { error: "checkout_failed", detail: String(e).slice(0, 200) });
  }
};
