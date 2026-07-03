// RenuviaMD — Medical Director finance backend (mdpayment.renuviamd.com).
// One unified AR lane for every governed clinic (ACHA / PI / NP / AllyOS), billed by BANK/ACH.
// SEPARATE from the AllyOS SaaS line subscription. PHI-free.
//
//   POST { action:"roster" }                                  -> owner: every clinic + finance fields
//   POST { action:"clinic", clinic_id }                       -> statement: fee, tag, invoices, outstanding
//   POST { action:"set_fee", clinic_id, md_fee, governance_type, md_billing_email, name }
//   POST { action:"bill", clinic_id, items:[{description,amount}], due_days }  -> creates+sends invoice
//
// Amounts are DOLLARS on the wire; converted to cents for Stripe.
// Secrets (Netlify env): STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: SITE_URL.
// NOTE: caller auth is not yet server-enforced (matches the other billing functions); the owner
// actions must be locked down before real production use.

const { requireOwner, requireClinic } = require("./lib/auth");
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
async function stripePost(path, params, secret, idemKey) {
  const headers = { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": STRIPE_VERSION };
  if (idemKey) headers["Idempotency-Key"] = idemKey;
  const res = await fetch("https://api.stripe.com/v1/" + path, { method: "POST", headers: headers, body: form(params) });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe " + path + ": " + ((data.error && data.error.message) || res.status));
  return data;
}
async function stripeDelete(path, secret) {
  const res = await fetch("https://api.stripe.com/v1/" + path, { method: "DELETE", headers: { Authorization: "Bearer " + secret, "Stripe-Version": STRIPE_VERSION } });
  return res.ok;
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
async function sbPost(table, row) {
  const res = await fetch(sbUrl() + "/rest/v1/" + table, { method: "POST", headers: Object.assign(sbHeaders(), { Prefer: "return=representation" }), body: JSON.stringify(row) });
  if (!res.ok) return null;
  const rows = await res.json();
  return (Array.isArray(rows) && rows[0]) || null;
}
async function sbPatch(query, body) { const res = await fetch(sbUrl() + "/rest/v1/" + query, { method: "PATCH", headers: Object.assign(sbHeaders(), { Prefer: "return=minimal" }), body: JSON.stringify(body) }); return res.ok; }
function parseBody(event) { try { return JSON.parse((event && event.body) || "{}"); } catch (e) { return {}; } }
function siteOf(event) { if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, ""); const h = (event && event.headers) || {}; if (h.origin) return h.origin; if (h.host) return "https://" + h.host; return ""; }
function json(code, obj) { return { statusCode: code, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }; }
function money(cents) { return Math.round((cents || 0)) / 100; }

async function ensureCustomer(clinic, key) {
  if (clinic.stripe_customer_id) {
    // keep the billing email current so Stripe's statement emails reach the clinic
    if (clinic.md_billing_email) { try { await stripePost("customers/" + encodeURIComponent(clinic.stripe_customer_id), { email: clinic.md_billing_email }, key); } catch (e) {} }
    return clinic.stripe_customer_id;
  }
  // Idempotency key from clinic_id: two concurrent creates return the SAME Stripe customer,
  // so the PATCH below can't clobber a different id written by a racing request.
  const c = await stripePost("customers", { name: clinic.name || "Clinic", email: clinic.md_billing_email || undefined, metadata: { clinic_id: clinic.id } }, key, "cust-" + clinic.id);
  // Write only if still null, then trust the DB: if a racing request won, bill THEIR customer —
  // the one the statement page reads — never a duplicate that invoicesFor would miss.
  await sbPatch("clinics?id=eq." + encodeURIComponent(clinic.id) + "&stripe_customer_id=is.null", { stripe_customer_id: c.id });
  const rows = await sbGet("clinics?id=eq." + encodeURIComponent(clinic.id) + "&select=stripe_customer_id");
  return (rows[0] && rows[0].stripe_customer_id) || c.id;
}
async function invoicesFor(customer, key) {
  if (!customer) return [];
  const list = await stripeGet("invoices?customer=" + encodeURIComponent(customer) + "&limit=10", key);
  return (list.data || []).map(function (inv) {
    return {
      number: inv.number, status: inv.status,
      amount_due: money(inv.amount_due), amount_paid: money(inv.amount_paid),
      created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      due: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
      url: inv.hosted_invoice_url || null, pdf: inv.invoice_pdf || null,
      paid: inv.status === "paid",
    };
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "not_configured" });
  const body = parseBody(event);
  const action = body.action || "clinic";

  try {
    if (action === "roster") {
      const g = await requireOwner(event); if (g.error) return g.error;
      const rows = await sbGet("clinics?select=id,name,governance_type,md_fee,md_subscription_status,md_billing_email,stripe_customer_id,status&order=name.asc");
      const clinics = (rows || []).map(function (c) {
        return { id: c.id, name: c.name, governance_type: c.governance_type || null, md_fee: (c.md_fee != null ? Number(c.md_fee) : null), status: c.md_subscription_status || "none", email: c.md_billing_email || null, on_stripe: !!c.stripe_customer_id };
      });
      const recurring = clinics.reduce(function (a, c) { return a + (c.md_fee || 0); }, 0);
      return json(200, { clinics: clinics, count: clinics.length, monthly_recurring: recurring });
    }

    // Onboard a new governed clinic straight onto the roster (name is the only required field;
    // fee/type/email can be set now or later). Owner only.
    if (action === "add_clinic") {
      const g = await requireOwner(event); if (g.error) return g.error;
      const name = (body.name || "").toString().trim().slice(0, 120);
      if (!name) return json(400, { error: "name_required", hint: "Give the clinic a name." });
      const row = {
        name: name,
        governance_type: body.governance_type || null,
        md_fee: (body.md_fee === undefined || body.md_fee === null || body.md_fee === "") ? null : Number(body.md_fee),
        md_billing_email: body.md_billing_email || null,
        md_of_record: !!body.governance_type,
        status: "active",
      };
      const created = await sbPost("clinics", row);
      if (!created || !created.id) return json(502, { error: "insert_failed", hint: "Could not create the clinic record." });
      return json(200, { ok: true, id: created.id });
    }

    const clinicId = body.clinic_id;
    if (!clinicId) return json(400, { error: "clinic_id required" });
    const rows = await sbGet("clinics?id=eq." + encodeURIComponent(clinicId) + "&select=id,name,governance_type,md_fee,md_billing_email,stripe_customer_id,md_subscription_status");
    const clinic = rows[0];
    if (!clinic) return json(404, { error: "clinic_not_found" });

    if (action === "set_fee") {
      const g = await requireOwner(event); if (g.error) return g.error;
      const patch = {};
      if (body.md_fee !== undefined) patch.md_fee = (body.md_fee === null || body.md_fee === "") ? null : Number(body.md_fee);
      if (body.governance_type !== undefined) patch.governance_type = body.governance_type || null;
      if (body.md_billing_email !== undefined) patch.md_billing_email = body.md_billing_email || null;
      if (body.name) patch.name = body.name;
      if (Object.keys(patch).length) { patch.billing_updated_at = new Date().toISOString(); await sbPatch("clinics?id=eq." + encodeURIComponent(clinicId), patch); }
      return json(200, { ok: true });
    }

    if (action === "bill") {
      const g = await requireOwner(event); if (g.error) return g.error;
      const raw = Array.isArray(body.items) ? body.items : [];
      const items = raw.map(function (it) { return { description: (it.description || "Charge").toString().slice(0, 120), cents: Math.round(Number(it.amount) * 100) }; }).filter(function (it) { return it.cents > 0; });
      if (!items.length) return json(400, { error: "no_items", hint: "Add at least one line with an amount." });
      // Default $5 processing fee on EVERY bill (pass-through of the capped bank/ACH cost).
      // Owner can override per bill: processing_fee:0 removes it, or any other amount.
      const feeDollars = (body.processing_fee === undefined || body.processing_fee === null) ? 5 : Number(body.processing_fee);
      if (feeDollars > 0) items.push({ description: "Processing fee", cents: Math.round(feeDollars * 100) });
      if (!clinic.md_billing_email) return json(400, { error: "no_email", hint: "Set the clinic's billing email first so Stripe can send the bill." });

      const customer = await ensureCustomer(clinic, key);
      // bill_key (client-generated per bill) makes the whole operation idempotent on Stripe's
      // side — a double-click or network retry returns the SAME invoice instead of a second one.
      const billKey = (body.bill_key || "").toString().replace(/[^\w-]/g, "").slice(0, 64) || null;
      const idem = function (suffix) { return billKey ? "mdbill-" + billKey + suffix : undefined; };
      // Create the DRAFT invoice FIRST, then attach every line DIRECTLY to it. Lines never sit
      // as floating "pending" items that a later invoice could sweep (or a failed run leave
      // behind to double-bill next month).
      const inv = await stripePost("invoices", {
        customer: customer,
        collection_method: "send_invoice",
        days_until_due: Math.max(1, Math.min(60, parseInt(body.due_days, 10) || 15)),
        description: "RenuviaMD — Medical Director services",
        metadata: { clinic_id: clinicId, type: "md_of_record" },
        payment_settings: { payment_method_types: ["us_bank_account", "card"] },
        auto_advance: true,
        pending_invoice_items_behavior: "exclude",
      }, key, idem(""));
      try {
        for (var i = 0; i < items.length; i++) {
          await stripePost("invoiceitems", { customer: customer, invoice: inv.id, currency: "usd", amount: items[i].cents, description: items[i].description }, key, idem("-it" + i));
        }
      } catch (e) {
        // A line failed — delete the draft so no partial invoice survives, then surface the error.
        try { await stripeDelete("invoices/" + encodeURIComponent(inv.id), key); } catch (e2) {}
        throw e;
      }
      let sent;
      try {
        sent = await stripePost("invoices/" + encodeURIComponent(inv.id) + "/finalize", {}, key);
      } catch (e) {
        // Idempotent retry of an already-finalized invoice — fetch it instead of failing.
        sent = await stripeGet("invoices/" + encodeURIComponent(inv.id), key);
        if (sent.status === "draft") throw e;
      }
      try { sent = await stripePost("invoices/" + encodeURIComponent(inv.id) + "/send", {}, key); } catch (e) {}
      return json(200, { ok: true, number: sent.number, amount_due: money(sent.amount_due), status: sent.status, url: sent.hosted_invoice_url || null, email: clinic.md_billing_email });
    }

    // default: clinic statement (clinic pay page + owner drill-in) — owner OR that clinic's member
    const g = await requireClinic(event, clinicId); if (g.error) return g.error;
    const invoices = await invoicesFor(clinic.stripe_customer_id, key);
    const outstanding = invoices.filter(function (v) { return v.status === "open" || v.status === "uncollectible"; }).reduce(function (a, v) { return a + v.amount_due; }, 0);
    return json(200, {
      name: clinic.name, governance_type: clinic.governance_type || null,
      md_fee: (clinic.md_fee != null ? Number(clinic.md_fee) : null),
      email: clinic.md_billing_email || null, status: clinic.md_subscription_status || "none",
      outstanding: outstanding, invoices: invoices,
    });
  } catch (e) {
    return json(502, { error: "md_billing_failed", detail: String(e).slice(0, 200) });
  }
};
