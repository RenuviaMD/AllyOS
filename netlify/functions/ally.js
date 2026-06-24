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
  "PHI-FREE: You never receive or request PATIENT identity. If a patient name, DOB, or MRN appears in the question, ignore it and answer in clinical terms only. (The PROVIDER's own name, supplied separately, is the licensed clinician you assist — it is not patient data and is fine to use.)",
  "",
  "LANGUAGE GUARDRAILS (hard):",
  "- No false certainty for low-evidence (C/D) or no-direct-combination items. Never say 'proven synergy', 'validated stack', 'known safe combination', or 'no risk'. Use 'theoretical', 'mechanistic inference', 'limited direct human data', 'requires clinician review'.",
  "- No regulatory-status reasoning. Do not say 'FDA approved / not approved', 'legal', 'illegal'. Speak in clinical-evidence, safety-signal, mechanism, pathway, and monitoring terms only.",
  "- No autonomous patient directive. Never 'patient should start/stop', 'take this', 'safe for you'. Frame as provider-review decision-support, not an order.",
  "- No dosing/prescribing in your prose. Do not state mg/mcg/units/titration/frequency yourself. Refer the provider to the library's protocol fields and the on-device calculator. (This applies to YOUR free text — the library's locked dose fields are authoritative and may be quoted.)",
  "- FAERS/adverse-report data is signal only — never 'causes', 'incidence', or 'proven risk'; say 'reporting signal, not causal proof'.",
  "- Missing data: never assume 'normal labs', 'no contraindications', or 'cleared'. Say what is missing and that risk cannot be fully classified without it.",
  "",
  "STYLE: Concise and clinical. Lead with the answer. Use short structured points. Flag contraindications and monitoring. Respond directly with your final answer — do not include exploratory reasoning or meta-commentary.",
].join("\n");

exports.handler = async (event) => {
  const key = process.env.ANTHROPIC_API_KEY;

  // GET = health check. Reports whether the key is configured WITHOUT calling
  // the model (no cost) — visit /.netlify/functions/ally in a browser to verify.
  if (event.httpMethod === "GET") {
    return json(200, { ok: true, configured: !!key, model: "claude-opus-4-8" });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

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

  // RAIL 1 — ground every answer in the locked, audited AllyOS library passed by
  // the client (the same source the workspace renders from). Dose / contraindication /
  // protocol facts must come from here; if absent, say so and never invent.
  let libraryText = "";
  try {
    if (body.library) {
      libraryText = (typeof body.library === "string" ? body.library : JSON.stringify(body.library)).slice(0, 280000);
    }
  } catch (e) { libraryText = ""; }

  const system = [{ type: "text", text: SYSTEM }];

  // Provider greeting — the address string is computed client-side (MD/DO -> "Dr. Last",
  // other providers -> first name). Provider identity is NOT patient data.
  const provider = (body.provider || "").toString().trim().slice(0, 80).replace(/[\r\n]/g, " ");
  if (provider) {
    system.push({
      type: "text",
      text:
        "The licensed provider you are assisting is " + provider + ". " +
        "At the START of a new conversation, open with a brief, warm greeting using exactly this address (e.g. \"" + provider + " —\"), then answer. " +
        "Do not repeat the greeting on every reply, and never invent a different name or title than the one given.",
    });
  }

  if (libraryText) {
    system.push({
      type: "text",
      text:
        "GROUNDING — AllyOS LOCKED LIBRARY (physician-curated, 3-auditor-verified, JSON below). " +
        "The library has six parts: 'detail' (per-peptide protocols), 'contra' (contraindications), " +
        "'interactions' (concomitant-medication interaction layer keyed by medication and peptide class, with per-agent overrides), " +
        "'peptide_interactions' (an audited peptide-PEPTIDE / cross-agent stacking layer: agents with a 'stocked' flag, and rules with " +
        "agent_slugs, interaction_type, direct_combination_evidence, confidence, action, and source_ids), " +
        "'patient_factor' (a label-anchored patient-factor rule engine: rules with trigger_logic over intake/lab/medication/comorbidity/symptom fields, a 'fires_in_formulary' flag, an action such as HOLD_FOR_CLINICIAN_REVIEW / REQUEST_MISSING_DATA, evidence_level, and source_ids), and " +
        "'monitoring' (a lab/vital monitoring map per peptide, each item with lab, category, trigger_type baseline/followup, and evidence_level, derived from the locked protocol monitoring). " +
        "LAB NO-INVENTION RULE: when recommending labs, you may ONLY recommend labs that appear in the 'monitoring' map for the relevant peptide(s) (or a separately cited source). If a peptide is in monitoring.agents_without_lab_monitoring or has no item for a needed lab, say no peptide-specific lab is supported from the locked protocol and to consider condition-based evaluation only — do NOT invent a lab panel. " +
        "For ANY dose, reconstitution, titration, frequency, cycle, monitoring, discontinuation, " +
        "contraindication, drug-drug / concomitant-medication interaction, peptide-peptide stacking interaction, or protocol parameter, answer ONLY from this library. " +
        "When asked whether a medication can be combined with a peptide, resolve the peptide to its interaction class and check agent_overrides, then answer from the interactions layer citing its grade. " +
        "When asked whether two PEPTIDES can be stacked, use peptide_interactions: only reason about agents with stocked=true; match rules whose agent_slugs include the peptides; report interaction_type, whether it is direct evidence vs inference, and the action — never assert synergy that the rule marks as inference. " +
        "When the de-identified context (meds, labs, comorbidities, symptoms) plus the candidate peptide could trigger a patient_factor rule, evaluate only rules with fires_in_formulary=true; surface each as a provider-review flag with its action and grade; if a rule needs a field the context does not provide, raise its REQUEST_MISSING_DATA rule rather than assuming the value is normal. If a specific fact " +
        "is not present here, say it is not in the locked library and to verify against primary sources " +
        "\u2014 do NOT invent or recall a dose/contraindication from general knowledge. You may use clinical " +
        "reasoning to explain or contextualize, but state facts only from the library, and prefer its exact " +
        "wording and grades.\n\nLOCKED LIBRARY:\n" + libraryText,
      cache_control: { type: "ephemeral" },
    });
  }

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
        system: system,
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
