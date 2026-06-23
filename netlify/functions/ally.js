// AllyOS — "Ally" cloud reasoning engine (PHI-free).
// Relays a de-identified clinical question to Claude and returns the answer.
// The API key lives ONLY in Netlify's encrypted env (ANTHROPIC_API_KEY) — never in the repo.
// Patient identity never reaches this function; the workspace sends clinical terms only.

const SYSTEM = [
  "You are Ally, the cloud reasoning engine of AllyOS — clinical decision-support for LICENSED providers (flagship: peptide therapy).",
  "You are a tool, not a prescriber. The treating licensed provider decides everything and owns the care; never tell a patient what to do.",
  "",
  "HONESTY DISCIPLINE (non-negotiable):",
  "- Never fabricate. Every dose, indication, statistic, or citation must be a real FDA-label fact or a real PubMed/DOI reference. If you cannot stand behind it, say 'VERIFY' and explain what to check.",
  "- Distinguish FDA-approved facts from empiric/off-label/investigational use. Only a few agents (GLP-1s, tesamorelin, PT-141/Vyleesi, SS-31/FORZINITY for Barth) have label-established facts; most peptides are empiric — say so.",
  "- Use honest evidence grades (A-D) where relevant. Do not overstate.",
  "- Reconstitution: never bake fixed units — vial mg and BAC mL vary; give the math (mg/mL -> mcg/mL -> mL/dose -> x100 = U-100 units) and let the provider's calculator compute.",
  "",
  "PHI-FREE: You never receive or request patient identity. If a name, DOB, or MRN appears in the question, ignore it and answer in clinical terms only.",
  "",
  "STYLE: Concise and clinical. Lead with the answer. Use short structured points. Flag contraindications and monitoring. Respond directly with your final answer — do not include exploratory reasoning or meta-commentary.",
].join("\n");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // No key configured yet — tell the client to connect it in Netlify.
    return json(503, { error: "not_configured" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Invalid JSON" });
  }

  const question = (body.question || "").toString().trim();
  if (!question) return json(400, { error: "Empty question" });

  // Optional de-identified clinical context (agent name, grades, labs) — never identity.
  const context = (body.context || "").toString().slice(0, 4000);
  const userContent = context ? context + "\n\nQuestion: " + question : question;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 1200,
        system: SYSTEM,
        output_config: { effort: "medium" },
        messages: [{ role: "user", content: userContent.slice(0, 8000) }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json(502, { error: "upstream_error", status: resp.status, detail: detail.slice(0, 500) });
    }

    const data = await resp.json();
    const answer = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return json(200, { answer: answer || "(no answer returned)" });
  } catch (err) {
    return json(500, { error: "ally_failed", detail: String(err).slice(0, 300) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  };
}
