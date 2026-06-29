// AllyOS Audit — "Run Inspection" chart parser (MD-only audit tool).
// POST { data:<base64>, mime:"application/pdf"|"image/png"|"image/jpeg" }
//   -> { fields:{...de-identified audit fields...} }
// Sends the scanned chart to Claude vision and extracts ONLY de-identified
// compliance-audit fields. The model is instructed to NEVER return patient
// name / DOB / phone / email / MRN — so what comes back and gets stored is
// PHI-free, even though the input image contains PHI. The chart image is not
// persisted by this function; it is forwarded to the model and discarded.
// API key lives ONLY in Netlify's encrypted env (ANTHROPIC_API_KEY).

const PROMPT = `You are a compliance-audit parser for a wellness IV/IM clinic chart (RenuviaMD AllyOS). The uploaded document is a SCANNED, often HANDWRITTEN chart packet that may include an Intake/Consent/GFE form (FORM-INTAKE-GFE-01), a Pre-Infusion Verify Checklist (FORM-05), and an IV Monitoring Sheet (FORM-05).

Extract ONLY the de-identified compliance-audit fields below and respond with a SINGLE JSON object and nothing else.

ABSOLUTE RULE — NO PHI: never output the patient's name, date of birth, phone, email, address, or MRN. If you are tempted to include an identifier, omit it. "provider" must be initials and/or credential only (e.g. "NP", "M. NP"), never a full patient name.

For each boolean: true only if the element is clearly documented/checked, false if clearly absent/blank, null if you cannot tell from the scan.

JSON shape (use exactly these keys):
{
  "date": "<date of service as written, or null>",
  "protocol": "<IV protocol/stack name or 'a-la-carte', or null>",
  "provider": "<initials/credential only, or null>",
  "vitC": <number grams of vitamin C if used, else null>,
  "nad": <bool: IV NAD+ present>,
  "mgCa": <bool: magnesium AND calcium together>,
  "gluAsth": <bool: glutathione used AND asthma/COPD noted>,
  "comorb": <bool: any comorbidity / health-history condition checked>,
  "gfe": <bool: valid GFE on file & signed>,
  "consent": <bool: consent signed>,
  "pre": <bool: pre-infusion vitals recorded>,
  "post": <bool: post-infusion vitals recorded>,
  "mon": <bool: during-infusion monitoring documented>,
  "after": <bool: aftercare given/documented>,
  "ae": <bool: adverse event occurred>,
  "susp": <bool: infusion stopped/suspended early>,
  "over": <bool: protocol override / deviation>,
  "note": "<one short de-identified note on any deficiency or finding, or null>",
  "confidence": "<high|medium|low — overall legibility of the scan>"
}`;

exports.handler = async (event) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (event.httpMethod === "GET") return json(200, { ok: true, configured: !!key });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!key) return json(503, { error: "not_configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "Invalid JSON" }); }
  const data = body.data, mime = body.mime || "application/pdf";
  if (!data) return json(400, { error: "No document data" });

  const block = mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: mime, data } };

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        // enable native PDF document input (scanned chart packets)
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: PROMPT,
        output_config: { effort: "medium" },
        messages: [{ role: "user", content: [block, { type: "text", text: "Extract the de-identified audit fields as JSON." }] }],
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return json(502, { error: "upstream_error", status: resp.status, detail: detail.slice(0, 400) });
    }
    const out = await resp.json();
    const text = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json(200, { fields: null, raw: text.slice(0, 300) });
    let fields;
    try { fields = JSON.parse(m[0]); } catch (e) { return json(200, { fields: null, raw: m[0].slice(0, 300) }); }
    return json(200, { fields });
  } catch (err) {
    return json(500, { error: "inspect_failed", detail: String(err).slice(0, 300) });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
