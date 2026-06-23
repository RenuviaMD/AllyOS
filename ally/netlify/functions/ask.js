// Netlify function: POST { messages:[{role,content}] } -> Ally's reply.
// Needs env var ANTHROPIC_API_KEY. Loads the curated knowledge base + system prompt.
const fs = require("fs");
const path = require("path");

let KB = "", SYS = "";
function load() {
  if (!KB) {
    const base = path.join(__dirname, "..", "..");
    KB = fs.readFileSync(path.join(base, "knowledge.json"), "utf8");
    SYS = fs.readFileSync(path.join(base, "SYSTEM-PROMPT.md"), "utf8");
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };
  try {
    load();
    const { messages = [] } = JSON.parse(event.body || "{}");
    // PHI guardrail + honesty discipline, then the curated KB as one cached block.
    const GUARD =
      "You are Ally — honest protocol/reference support for licensed providers. " +
      "Operate at the protocol/reference level ONLY. Never request, store, or rely on patient identifiers " +
      "(name, DOB, MRN, address, contact). If a message contains identifiers, do not repeat them and ask the " +
      "provider to use de-identified terms (age, labs, meds). Grade evidence A–D, name failed trials, cite " +
      "real sources or say VERIFY — never invent citations.\n\n";
    // One large static block (guard + system prompt + knowledge base) marked for prompt caching:
    // ~90% input-cost cut on cache hits, since the 107 KB KB is re-sent every query.
    const system = [{
      type: "text",
      text: GUARD + SYS + "\n\n# KNOWLEDGE BASE (answer from this only)\n" + KB,
      cache_control: { type: "ephemeral" },
    }];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",         // strong + fast; bump to opus for hardest clinical Qs
        max_tokens: 1024,
        system,
        messages: messages.slice(-8),        // keep recent turns
      }),
    });
    const data = await r.json();
    const text = (data.content && data.content[0] && data.content[0].text) || "Sorry — try again.";
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
