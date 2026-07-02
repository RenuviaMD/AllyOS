// Shared server-side caller auth for AllyOS billing functions.
// The caller's identity comes from a VERIFIED Supabase user JWT (Authorization: Bearer <token>);
// the service role is used only to look up owner status (app_admins) + clinic membership
// (clinic_members). Bundled into each function by esbuild via require("./lib/auth").
//
//   requireOwner(event)            -> { caller } | { error }   (RenuviaMD owner / app_admin only)
//   requireClinic(event, clinicId) -> { caller } | { error }   (owner, OR a member of that clinic)
// On failure the { error } is a ready-to-return Netlify response (401/403).

function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
function svcKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY; }
function bearer(event) {
  const h = (event && event.headers) || {};
  const a = h.authorization || h.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(a);
  return m ? m[1].trim() : null;
}
async function sbRest(query) {
  const res = await fetch(sbUrl() + "/rest/v1/" + query, { headers: { apikey: svcKey(), Authorization: "Bearer " + svcKey() } });
  return res.ok ? res.json() : [];
}
function deny(code, detail) { return { statusCode: code, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: code === 401 ? "unauthorized" : "forbidden", detail: detail }) }; }

// Verify the JWT with Supabase (GoTrue validates signature + expiry) and resolve authz context.
async function verifyCaller(event) {
  const token = bearer(event);
  if (!token || !sbUrl() || !svcKey()) return null;
  let user;
  try {
    const r = await fetch(sbUrl() + "/auth/v1/user", { headers: { apikey: svcKey(), Authorization: "Bearer " + token } });
    if (!r.ok) return null;
    user = await r.json();
  } catch (e) { return null; }
  if (!user || !user.id) return null;
  const admins = await sbRest("app_admins?user_id=eq." + encodeURIComponent(user.id) + "&select=user_id");
  const members = await sbRest("clinic_members?user_id=eq." + encodeURIComponent(user.id) + "&select=clinic_id");
  return {
    userId: user.id, email: user.email || null,
    isOwner: Array.isArray(admins) && admins.length > 0,
    clinicIds: (Array.isArray(members) ? members : []).map(function (m) { return m.clinic_id; }).filter(Boolean),
  };
}
async function requireOwner(event) {
  const c = await verifyCaller(event);
  if (!c) return { error: deny(401, "sign in required") };
  if (!c.isOwner) return { error: deny(403, "owner only") };
  return { caller: c };
}
async function requireClinic(event, clinicId) {
  const c = await verifyCaller(event);
  if (!c) return { error: deny(401, "sign in required") };
  if (c.isOwner || (clinicId && c.clinicIds.indexOf(clinicId) >= 0)) return { caller: c };
  return { error: deny(403, "not authorized for this clinic") };
}
module.exports = { verifyCaller, requireOwner, requireClinic };
