// AllyOS billing — open the Stripe Customer Portal for a clinic (self-serve plan/card/cancel).
// POST { clinic_id }  ->  { url }.  Requires the clinic to already have a stripe_customer_id.
// Secrets (Netlify env): STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: SITE_URL.
const B = require("./lib/billing");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return B.json(405, { error: "method_not_allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return B.json(503, { error: "not_configured" });

  const body = B.parseBody(event);
  const clinicId = body.clinic_id;
  if (!clinicId) return B.json(400, { error: "clinic_id required" });

  try {
    const rows = await B.sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=stripe_customer_id");
    const clinic = rows[0];
    if (!clinic || !clinic.stripe_customer_id) return B.json(400, { error: "no_customer" });
    const site = B.siteOf(event);
    const ps = await B.stripe("billing_portal/sessions", { customer: clinic.stripe_customer_id, return_url: site + "/allyos/dashboard.html" }, key);
    return B.json(200, { url: ps.url });
  } catch (e) {
    return B.json(502, { error: "portal_failed", detail: String(e).slice(0, 200) });
  }
};
