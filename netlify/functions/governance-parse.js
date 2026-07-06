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

  const KEY = key;
  function pushDoc(content, label, doc) {
    if (!doc) return;
    content.push({ type: "text", text: "\n\n=== " + label + " ===\n" });
    if (doc.image) {
      var m = /^data:([^;]+);base64,(.*)$/.exec(doc.image);
      var mime = m ? m[1] : (doc.mime || "image/jpeg");
      var data = m ? m[2] : doc.image;
      // PDFs go in as a document block (Claude reads them natively); images as image blocks.
      if (mime === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: data } });
      else content.push({ type: "image", source: { type: "base64", media_type: mime, data: data } });
    } else if (doc.text) { content.push({ type: "text", text: String(doc.text).slice(0, 12000) }); }
  }
  async function callModel(sys, content, maxTok) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: maxTok || 1500, system: sys, output_config: { effort: "medium" }, messages: [{ role: "user", content: content }] }),
    });
    if (!resp.ok) throw new Error("upstream " + resp.status + " " + (await resp.text()).slice(0, 200));
    const data = await resp.json();
    const raw = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("").trim();
    const jStart = raw.indexOf("{"), jEnd = raw.lastIndexOf("}");
    return JSON.parse(jStart >= 0 ? raw.slice(jStart, jEnd + 1) : raw);
  }

  // ---- EXTRACT (read a dragged chart doc/photo → encounter metadata) ----
  if (body.mode === "extract") {
    if (!body.doc) return json(400, { error: "no_doc" });
    const EX_SYS =
      "Read this ONE wellness encounter document (progress / encounter note, scan or photo — may be handwritten) and " +
      "extract identifying metadata. Return STRICT JSON only: " +
      "{\"chart_id\":\"...\",\"name\":\"Full Patient Name\",\"initials\":\"X.Y.\",\"line\":\"iv|pep|bhrt\",\"date\":\"MM/DD/YYYY\"}. " +
      "chart_id = the chart/MRN/encounter number if present, else empty. " +
      "name = the patient's full name exactly as written (for the reviewing physician's on-screen identification). " +
      "initials = first + last initial only (e.g. 'J.D.'). " +
      "line = iv (IV/IM infusion), pep (peptide therapy), or bhrt (hormone/BHRT) based on the therapy documented. " +
      "date = date of service. Use '' for any field you cannot find.";
    const content = [{ type: "text", text: "Extract the metadata from this document." }];
    pushDoc(content, "CHART", body.doc);
    try {
      const p = await callModel(EX_SYS, content, 400);
      return json(200, {
        chart_id: String(p.chart_id || "").slice(0, 48),
        name: String(p.name || "").slice(0, 80),
        initials: String(p.initials || "").slice(0, 12),
        line: String(p.line || "iv").toLowerCase(),
        date: String(p.date || "").slice(0, 24),
      });
    } catch (e) { return json(502, { error: "extract_failed", detail: String(e).slice(0, 200) }); }
  }

  // ---- ENCOUNTER-NOTE INSPECTION (cash-pay wellness — note only, no superbill) ----
  if (body.mode === "dual") {
    const params = Array.isArray(body.params) ? body.params.filter(function (x) { return typeof x === "string"; }).slice(0, 30) : [];
    if (!body.note) return json(400, { error: "no_docs", hint: "Attach the encounter note." });
    const DUAL_SYS =
      "You are a MEDICAL-DIRECTOR GOVERNANCE AUDITOR reviewing ONE cash-pay wellness encounter note " +
      "(" + (body.line || "IV/peptide/BHRT") + "). There is NO superbill, claim, or billing document — this is a " +
      "documentation review of the encounter note ONLY. Review the note against the documentation-compliance " +
      "PARAMETERS below. Never mention or expect a superbill/claim/billing; 'conflicts' MUST be an empty array. " +
      "Judge ONLY from the note; never invent.\n" +
      "PARAMETERS:\n" + params.map(function (p, i) { return (i + 1) + ". " + p; }).join("\n") + "\n" +
      "Return STRICT JSON only: {\"status\":\"PASS|FAIL\",\"deficiencies\":[\"...\"],\"conflicts\":[]," +
      "\"clean\":[\"parameter that passed\"],\"narrative\":\"2-4 sentence summary\"}. " +
      "status=FAIL only if a required PARAMETER is missing; else PASS. Keep every string PHI-free (no name/DOB).";
    const content = [{ type: "text", text: "Review this encounter note against the parameters." }];
    pushDoc(content, "ENCOUNTER NOTE", body.note);
    try {
      const p = await callModel(DUAL_SYS, content, 1600);
      return json(200, {
        status: (String(p.status || "").toUpperCase() === "PASS") ? "PASS" : "FAIL",
        deficiencies: (p.deficiencies || []).map(function (x) { return String(x).slice(0, 200); }),
        conflicts: [],
        clean: (p.clean || []).map(function (x) { return String(x).slice(0, 120); }),
        narrative: String(p.narrative || "").slice(0, 900),
      });
    } catch (e) { return json(502, { error: "dual_parse_failed", detail: String(e).slice(0, 200) }); }
  }

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
