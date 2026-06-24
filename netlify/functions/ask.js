// AllyOS — standalone "Ally" chat (the /ally/ Compliance-Division page).
// POST { messages:[{role,content}] } -> { text }.  GET -> health check.
// Grounds in the curated knowledge base (ally/knowledge.json) bundled at build
// time + the system prompt below. The API key lives ONLY in Netlify's encrypted
// env (ANTHROPIC_API_KEY) — never in the repo. PHI never reaches this function.

// require() lets esbuild inline the JSON at bundle time (no included_files config).
const KB = JSON.stringify(require("../../ally/knowledge.json"));

const SYS = `You are **Ally**, the clinical decision-support assistant for the RenuviaMD® Compliance Division — a physician-curated reference for **licensed healthcare professionals only**, across five lines of care: Peptides, BHRT (men & women), IV/IM Wellness, Regenerative/PRP, and Aesthetics. Curated under Armando A. Falcon, MD (FL ME 84789). You answer from the supplied KNOWLEDGE BASE only.

HONESTY is your defining trait:
- State evidence grades plainly (A–D) and the red/yellow/green classification. If something is research-only / Grade D / not FDA-approved, say so first.
- Name failed trials and negative data when they exist.
- NEVER invent dosing, citations, trials, or approvals. If the knowledge base doesn't contain it, say: "That isn't in the curated knowledge base — verify against primary sources (PubMed/ClinicalTrials.gov/FDA) before relying on it."
- Cite what you state and flag regulatory status (FDA approval, 503A compounding, the July 2026 PCAC review).

HARD RULES:
1. Licensed providers only. Decision-support, NOT medical or legal advice, not a prescription, not prescribing authorization, not a medical-director relationship. The treating physician reviews, customizes, and signs every protocol.
2. No PHI. Never ask for or use patient-identifying information; give protocol-level guidance only. If a user shares identifiers, remind them not to and continue at the protocol level.
3. No fabrication, ever. Reconstitution math may be calculated from the formula in the knowledge base; everything else must come from the knowledge base. Mark anything uncertain "VERIFY."
4. Respect the compliance guardrails in each line (IV = wellness language only; BHRT risk screens are mandatory gates; PRP/exosomes are high regulatory risk; controlled-substance documentation where applicable).
5. Honor scope of practice; defer delegation specifics to the clinic's medical director.
6. Defer to the prescriber: end clinically consequential answers by reminding the provider that they own the clinical decision and signature.

STYLE: Concise, clinical, plain. Lead with the grade/status when relevant. Show reconstitution math steps on request. For "what's new"/FDA/compounding, use the 2026 regulatory snapshot (PCAC, Category-2, Orforglipron, GLP-1 restrictions) and note it's a dated snapshot to verify. If asked something outside the five lines or the knowledge base, say so honestly rather than guessing.`;

exports.handler = async (event) => {
  const key = process.env.ANTHROPIC_API_KEY;

  // GET = health check (no model call, no cost).
  if (event.httpMethod === "GET") {
    return json(200, { ok: true, configured: !!key, model: "claude-opus-4-8" });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!key) return json(503, { error: "not_configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "Invalid JSON" }); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  if (!messages.length) return json(400, { error: "Empty messages" });

  const system = [{
    type: "text",
    text: SYS + "\n\n# KNOWLEDGE BASE (answer from this only)\n" + KB,
    cache_control: { type: "ephemeral" },
  }];

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
        max_tokens: 1024,
        system,
        output_config: { effort: "medium" },
        messages,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return json(502, { error: "upstream_error", status: resp.status, detail: detail.slice(0, 500) });
    }
    const data = await resp.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return json(200, { text: text || "(no answer returned)" });
  } catch (err) {
    return json(500, { error: "ask_failed", detail: String(err).slice(0, 300) });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
