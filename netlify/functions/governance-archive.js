// AllyOS Governance — sign & archive a completed inspection into the per-clinic audit log.
// POST { clinic_id?, clinic, report_date, rating, findings, charts:[...] } -> { ok, id }
// Owner OR a member of the clinic. Service-role insert (no client INSERT policy on the table).
// PHI posture: the caller controls what's in `charts` — keep it to chart ref + initials + verdict.

const { requireClinic, verifyCaller } = require("./lib/auth");

function sbHeaders() { const k = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json" }; }
function sbUrl() { return (process.env.SUPABASE_URL || "").replace(/\/$/, ""); }
function json(code, obj) { return { statusCode: code, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }; }

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  let body; try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "invalid_json" }); }

  const clinicId = body.clinic_id || null;
  let caller;
  if (clinicId) { const g = await requireClinic(event, clinicId); if (g.error) return g.error; caller = g.caller; }
  else { caller = await verifyCaller(event); if (!caller) return json(401, { error: "unauthorized" }); }

  const row = {
    clinic_id: clinicId,
    clinic: (body.clinic || "").toString().slice(0, 160) || null,
    report_date: (body.report_date || "").toString().slice(0, 40) || null,
    rating: (body.rating || "").toString().slice(0, 40) || null,
    findings: Math.max(0, parseInt(body.findings, 10) || 0),
    charts: Array.isArray(body.charts) ? body.charts.slice(0, 20) : [],
    signed_by: caller.userId || null,
  };
  try {
    const res = await fetch(sbUrl() + "/rest/v1/governance_inspections", {
      method: "POST", headers: Object.assign(sbHeaders(), { Prefer: "return=representation" }), body: JSON.stringify(row),
    });
    if (!res.ok) return json(502, { error: "archive_failed", detail: (await res.text()).slice(0, 200) });
    const rows = await res.json();
    return json(200, { ok: true, id: (rows[0] && rows[0].id) || null });
  } catch (e) { return json(500, { error: "archive_error", detail: String(e).slice(0, 200) }); }
};
