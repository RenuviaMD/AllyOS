// AllyOS — NPI access-verification proxy.
// GET /.netlify/functions/npi?npi=1234567890
//   -> { valid, found, npi, name, credential, taxonomy, enumeration, status, roleSuggestion, note }
//
// PURPOSE: an OPTIONAL anti-fraud confirmation — it confirms the person is
// ENUMERATED in the federal NPPES registry (a real, registered professional
// entity). It does NOT prove the license is active and does NOT decide clinical
// scope or who may perform a GFE — licensure is the state board's, scope is the
// practice's Medical Director's. NPI is not required (cash-pay clinics may have
// none); the credential of record is the state license + the clinic's attestation.
// We name no role as "allowed to authorize"; we only surface what NPPES says.
//
// NPPES (the federal registry) has no CORS headers, so the lookup must run
// server-side. No API key is required for the public NPPES Registry API.

exports.handler = async (event) => {
  const npi = ((event.queryStringParameters || {}).npi || "").trim();

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  if (!/^\d{10}$/.test(npi)) return json(400, { valid: false, error: "NPI must be 10 digits." });
  if (!luhnNPI(npi)) return json(200, { valid: false, found: false, npi, error: "Invalid NPI check digit (failed Luhn/80840 validation)." });

  try {
    const url = "https://npiregistry.cms.hhs.gov/api/?version=2.1&number=" + encodeURIComponent(npi);
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    if (!resp.ok) return json(502, { valid: true, found: false, npi, error: "NPPES lookup failed (" + resp.status + ")." });
    const data = await resp.json();

    if (!data.result_count || !data.results || !data.results.length) {
      return json(200, { valid: true, found: false, npi, note: "Valid NPI format but no active record in NPPES — verify manually." });
    }

    const r = data.results[0];
    const b = r.basic || {};
    const isOrg = r.enumeration_type === "NPI-2";
    const tax = (r.taxonomies || []).find((t) => t.primary) || (r.taxonomies || [])[0] || {};
    const credential = (b.credential || "").replace(/[.,\s]+$/, "").trim();
    const name = isOrg
      ? (b.organization_name || "")
      : [b.first_name, b.last_name].filter(Boolean).join(" ");

    return json(200, {
      valid: true,
      found: true,
      npi,
      enumeration: isOrg ? "Organization (NPI-2)" : "Individual (NPI-1)",
      name,
      credential,
      taxonomy: tax.desc || "",
      status: b.status === "A" ? "Active" : (b.status || "Unknown"),
      roleSuggestion: suggestRole(isOrg, credential, tax.desc || ""),
      note: "Access verification only — AllyOS does not assign clinical scope. The clinic/Medical Director assigns the actual role.",
    });
  } catch (err) {
    return json(500, { valid: true, found: false, npi, error: String(err).slice(0, 200) });
  }
};

// NPI check-digit validation: Luhn over ("80840" + first 9 digits), compare to 10th.
function luhnNPI(npi) {
  const s = "80840" + npi.slice(0, 9);
  let sum = 0, alt = true;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = +s[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return ((10 - (sum % 10)) % 10) === +npi[9];
}

// Suggest a seat — NOT a scope decision. Org NPIs are not practitioners.
function suggestRole(isOrg, credential, taxonomy) {
  if (isOrg) return "organization (clinic) — anchors the org/wholesale account, not a practitioner seat";
  const t = (credential + " " + taxonomy).toLowerCase();
  if (/\b(md|do|m\.d|d\.o|physician|nurse practitioner|\bnp\b|physician assistant|\bpa-?c?\b)\b/.test(t) || /nurse practitioner|physician assistant|family medicine|internal medicine/.test(t)) {
    return "eligible for an authorizing-provider seat (the clinic confirms)";
  }
  if (/\b(rn|lpn|registered nurse|licensed practical)\b/.test(t) || /registered nurse|practical nurse/.test(t)) {
    return "executor seat (RN/LPN) — runs infusions under an authorizing provider";
  }
  return "verified professional — the clinic assigns the seat/role";
}

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json", "access-control-allow-origin": "*" }, body: JSON.stringify(obj) };
}
