// Shared billing helpers — Stripe REST via fetch (no SDK dep) + Supabase service-role writes.
// Files under functions/lib are NOT registered as endpoints; they're bundled into the functions
// that require() them. Secrets come from Netlify env only (never committed).
const crypto = require("crypto");

const STRIPE_VERSION = "2024-06-20";

// Stripe uses application/x-www-form-urlencoded with PHP-style brackets for nesting.
function form(obj, prefix) {
  const parts = [];
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v === undefined || v === null) return;
    const key = prefix ? prefix + "[" + k + "]" : k;
    if (Array.isArray(v)) {
      v.forEach((it, i) => {
        if (it && typeof it === "object") parts.push(form(it, key + "[" + i + "]"));
        else parts.push(encodeURIComponent(key + "[" + i + "]") + "=" + encodeURIComponent(it));
      });
    } else if (v && typeof v === "object") {
      parts.push(form(v, key));
    } else {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(v));
    }
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

async function stripeGet(path, secret) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    headers: { Authorization: "Bearer " + secret, "Stripe-Version": STRIPE_VERSION },
  });
  const data = await res.json();
  if (!res.ok) throw new Error("stripe GET " + path + ": " + res.status);
  return data;
}

// Verify a Stripe webhook signature (the SDK's constructEvent, done by hand).
function verifySignature(rawBody, sigHeader, secret, toleranceSec) {
  if (!sigHeader || !secret) return false;
  const parts = {};
  sigHeader.split(",").forEach((kv) => { const i = kv.indexOf("="); if (i > 0) (parts[kv.slice(0, i)] = parts[kv.slice(0, i)] || kv.slice(i + 1)); });
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = crypto.createHmac("sha256", secret).update(t + "." + rawBody, "utf8").digest("hex");
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1)); } catch (e) { ok = false; }
  if (ok && toleranceSec) {
    const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10));
    if (age > toleranceSec) return false;
  }
  return ok;
}

// ---- Supabase service-role writes (bypasses RLS; webhook is the only writer of billing fields) ----
function sbHeaders() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" };
}
function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
async function sbGet(query) {
  const res = await fetch(sbUrl() + "/rest/v1/" + query, { headers: sbHeaders() });
  return res.ok ? res.json() : [];
}
async function sbPatch(query, body) {
  const res = await fetch(sbUrl() + "/rest/v1/" + query, {
    method: "PATCH", headers: Object.assign(sbHeaders(), { Prefer: "return=minimal" }), body: JSON.stringify(body),
  });
  return res.ok;
}

function parseBody(event) {
  try { return JSON.parse((event && event.body) || "{}"); } catch (e) { return {}; }
}
function siteOf(event) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = (event && event.headers) || {};
  if (h.origin) return h.origin;
  if (h.host) return "https://" + h.host;
  return "";
}
function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}

module.exports = { form, stripe, stripeGet, verifySignature, sbGet, sbPatch, parseBody, siteOf, json };
