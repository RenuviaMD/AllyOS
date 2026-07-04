// AllyOS Governance — chart-note compliance parser (text OR handwriting vision).
// POST { line, items:[label,...], text?, image?(base64), mime? } -> { results:[{item,status,evidence}] }
//   status ∈ "present" | "missing" | "na"
// Sonnet-5 for pasted EMR text AND for photographed handwritten notes (vision). It returns ONLY the
// PHI-free per-parameter verdict — the note content is processed transiently and NEVER stored or
// logged here. Auth-gated (owner OR the clinic's member).
//
// PHI NOTE: for no-EMR clinics the uploaded image is a chart note; only the compliance verdict is
// returned. Do not persist the note/image anywhere. Secrets: ANTHROPIC_API_KEY (+ SUPABASE_* for auth).

const { requireClinic, verifyCaller } = require("./lib/auth");

function json(code, obj) { return { statusCode: code, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }; }

const SYS =
  "You are a MEDICAL-DIRECTOR GOVERNANCE AUDITOR reviewing ONE wellness chart note (IV/IM, peptide, or BHRT). " +
  "You are given a fixed list of documentation-compliance PARAMETERS. For EACH parameter decide, strictly from " +
  "what the note actually documents, whether it is:\n" +
  "  present  — the note clearly documents this element\n" +
  "  missing  — the note should have it for this visit but does not\n" +
  "  na       — genuinely not applicable to this encounter\n" +
  "Rules: judge ONLY from the note; never assume or invent. If you cannot find an element, it is 'missing', not 'present'. " +
  "Keep 'evidence' to a SHORT quote/paraphrase from the note (<=90 chars) — never include patient name or DOB. " +
  "Return STRICT JSON only: {\"results\":[{\"item\":\"<label>\",\"status\":\"present|missing|na\",\"evidence\":\"...\"}]} " +
  "with exactly one entry per parameter, in the given order.";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: "not_configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "invalid_json" }); }

  // Always require a signed-in caller (it hits the paid AI API). With a clinic_id, enforce membership.
  const clinicId = body.clinic_id;
  if (clinicId) { const g = await requireClinic(event, clinicId); if (g.error) return g.error; }
  else { const c = await verifyCaller(event); if (!c) return json(401, { error: "unauthorized" }); }

  const items = Array.isArray(body.items) ? body.items.filter(function (x) { return typeof x === "string"; }).slice(0, 30) : [];
  if (!items.length) return json(400, { error: "no_items" });
  const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
  const image = typeof body.image === "string" ? body.image : "";
  if (!text.trim() && !image) return json(400, { error: "no_note", hint: "Paste the note text or attach a photo." });

  // Build the user content — parameters + the note (text or image).
  const promptHead =
    "LINE: " + (body.line || "unspecified") + "\n\nPARAMETERS (score each, in order):\n" +
    items.map(function (it, i) { return (i + 1) + ". " + it; }).join("\n") +
    "\n\nCHART NOTE" + (image ? " (photograph of a handwritten/printed note — read it):" : ":") + "\n";

  const content = [{ type: "text", text: promptHead }];
  if (image) {
    // data URL or raw base64
    var m = /^data:([^;]+);base64,(.*)$/.exec(image);
    var mime = m ? m[1] : (body.mime || "image/jpeg");
    var data = m ? m[2] : image;
    content.push({ type: "image", source: { type: "base64", media_type: mime, data: data } });
  } else {
    content.push({ type: "text", text: text });
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1200,
        system: SYS,
        output_config: { effort: "medium" },
        messages: [{ role: "user", content: content }],
      }),
    });
    if (!resp.ok) { const d = await resp.text(); return json(502, { error: "upstream_error", status: resp.status, detail: d.slice(0, 300) }); }
    const data = await resp.json();
    const raw = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("").trim();
    let parsed;
    try {
      const jStart = raw.indexOf("{"), jEnd = raw.lastIndexOf("}");
      parsed = JSON.parse(jStart >= 0 ? raw.slice(jStart, jEnd + 1) : raw);
    } catch (e) { return json(502, { error: "parse_failed", detail: raw.slice(0, 200) }); }
    const results = (parsed.results || []).map(function (r) {
      var s = String(r.status || "").toLowerCase();
      if (s !== "present" && s !== "missing" && s !== "na") s = "missing";
      return { item: r.item, status: s, evidence: (r.evidence || "").toString().slice(0, 90) };
    });
    return json(200, { results: results });
  } catch (err) {
    return json(500, { error: "parse_error", detail: String(err).slice(0, 200) });
  }
};
