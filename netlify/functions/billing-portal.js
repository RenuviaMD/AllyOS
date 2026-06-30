// AllyOS billing — open the Stripe Customer Portal for a clinic (self-serve plan/card/cancel).
// POST { clinic_id }  ->  { url }.  Requires the clinic to already have a stripe_customer_id.
// Secrets (Netlify env): STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: SITE_URL.

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
async function stripe(path, params, secret) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": STRIPE_VERSION },
    body: form(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe " + path + ": " + ((data.error && data.error.message) || res.status));
  return data;
}
function sbHeaders() { const k = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" }; }
function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
async function sbGet(query) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { headers: sbHeaders() }); return res.ok ? res.json() : []; }
function parseBody(event) { try { return JSON.parse((event && event.body) || "{}"); } catch (e) { return {}; } }
function siteOf(event) { if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, ""); const h = (event && event.headers) || {}; if (h.origin) return h.origin; if (h.host) return "https://" + h.host; return ""; }
function json(statusCode, obj) { return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "not_configured" });

  const body = parseBody(event);
  const clinicId = body.clinic_id;
  if (!clinicId) return json(400, { error: "clinic_id required" });

  try {
    const rows = await sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=stripe_customer_id");
    const clinic = rows[0];
    if (!clinic || !clinic.stripe_customer_id) return json(400, { error: "no_customer" });
    const site = siteOf(event);
    const ps = await stripe("billing_portal/sessions", { customer: clinic.stripe_customer_id, return_url: site + "/allyos/dashboard.html" }, key);
    return json(200, { url: ps.url });
  } catch (e) {
    return json(502, { error: "portal_failed", detail: String(e).slice(0, 200) });
  }
};
