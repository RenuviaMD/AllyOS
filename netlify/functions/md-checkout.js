// AllyOS — Medical Director-of-record billing (SEPARATE product from the AllyOS SaaS lines).
// Each clinic pays its own complexity-based monthly fee by BANK / ACH (us_bank_account only —
// keeps the fee ~$5, not card %). PHI-free.
//   POST { clinic_id }             -> { name, md_fee, md_status }   (a quote for the pay page)
//   POST { clinic_id, start:true } -> { url }                       (Stripe Checkout, ACH auto-pay)
// The per-clinic amount comes from clinics.md_fee (the owner sets it in the cockpit).
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
async function sbPatch(query, body) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { method: "PATCH", headers: Object.assign(sbHeaders(), { Prefer: "return=minimal" }), body: JSON.stringify(body) }); return res.ok; }
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
    const rows = await sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=id,name,stripe_customer_id,md_fee,md_subscription_id,md_subscription_status");
    const clinic = rows[0];
    if (!clinic) return json(404, { error: "clinic_not_found" });

    const fee = Number(clinic.md_fee);
    const quote = { name: clinic.name || "Your clinic", md_fee: (fee > 0 ? fee : null), md_status: clinic.md_subscription_status || "none" };

    // Quote only (page load) — no session created.
    if (!body.start) return json(200, quote);

    // Start auto-pay: needs a fee set by the owner first.
    if (!(fee > 0)) return json(200, Object.assign({ ok: false, no_fee: true }, quote));

    let customer = clinic.stripe_customer_id;
    if (!customer) {
      const c = await stripe("customers", { name: clinic.name || "AllyOS clinic", metadata: { clinic_id: clinicId } }, key);
      customer = c.id;
      await sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), { stripe_customer_id: customer });
    }

    const site = siteOf(event);
    const session = await stripe("checkout/sessions", {
      mode: "subscription",
      customer: customer,
      // BANK / ACH only — no card. Complexity-based amount priced inline per clinic.
      payment_method_types: ["us_bank_account"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "Medical Director — Monthly (" + (clinic.name || "clinic") + ")" },
          unit_amount: Math.round(fee * 100),
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      client_reference_id: clinicId,
      // metadata.type routes this to the md_* fields in the webhook (NOT the AllyOS line fields).
      subscription_data: { metadata: { clinic_id: clinicId, type: "md_of_record" } },
      success_url: site + "/allyos/md-pay.html?paid=1",
      cancel_url: site + "/allyos/md-pay.html?canceled=1",
    }, key);
    return json(200, { ok: true, url: session.url });
  } catch (e) {
    return json(502, { error: "md_checkout_failed", detail: String(e).slice(0, 200) });
  }
};
