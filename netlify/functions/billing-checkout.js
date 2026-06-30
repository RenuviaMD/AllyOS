// AllyOS billing — create a Stripe Checkout Session for the platform subscription.
// POST { clinic_id, quantity? }  ->  { url }.  quantity = # active lines (1..3); the
// volume-tiered Price charges the bundle (1=$199, 2=$349, 3=$499). PHI-free.
// Secrets (Netlify env): STRIPE_SECRET_KEY, STRIPE_PRICE_PLATFORM, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. Optional: SITE_URL.
const B = require("./lib/billing");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return B.json(405, { error: "method_not_allowed" });
  const key = process.env.STRIPE_SECRET_KEY, price = process.env.STRIPE_PRICE_PLATFORM;
  if (!key || !price) return B.json(503, { error: "not_configured" });

  const body = B.parseBody(event);
  const clinicId = body.clinic_id;
  if (!clinicId) return B.json(400, { error: "clinic_id required" });
  let qty = parseInt(body.quantity, 10);

  try {
    const rows = await B.sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=id,name,stripe_customer_id,lines");
    const clinic = rows[0];
    if (!clinic) return B.json(404, { error: "clinic_not_found" });
    if (!(qty >= 1 && qty <= 3)) qty = Math.max(1, Math.min(3, (clinic.lines || []).length || 1));

    let customer = clinic.stripe_customer_id;
    if (!customer) {
      const c = await B.stripe("customers", { name: clinic.name || "AllyOS clinic", metadata: { clinic_id: clinicId } }, key);
      customer = c.id;
      await B.sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), { stripe_customer_id: customer });
    }

    const site = B.siteOf(event);
    const session = await B.stripe("checkout/sessions", {
      mode: "subscription",
      customer: customer,
      line_items: [{ price: price, quantity: qty }],
      client_reference_id: clinicId,
      subscription_data: { metadata: { clinic_id: clinicId } },
      allow_promotion_codes: true,
      success_url: site + "/allyos/dashboard.html?billing=success",
      cancel_url: site + "/allyos/dashboard.html?billing=cancel",
    }, key);
    return B.json(200, { url: session.url });
  } catch (e) {
    return B.json(502, { error: "checkout_failed", detail: String(e).slice(0, 200) });
  }
};
