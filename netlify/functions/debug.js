// AllyOS — Debugger Agent. Triages a clinic issue from the DE-IDENTIFIED Get Help
// diagnostic. POST { diagnostic:{...}, message:"..." } -> { triage:{...} }.
// Grounded in a fixed runbook of known failure classes so it matches symptoms to
// known causes instead of inventing. PHI-free in/out. Key in Netlify env only.

const SYS = `You are the AllyOS Support Engineer — you triage a client clinic's issue from a DE-IDENTIFIED diagnostic snapshot (no PHI).

Architecture facts (use these): AllyOS is a static client-side app (HTML/JS on Netlify). The CODE is identical for every clinic. All state is per-device browser localStorage. The server holds no PHI and no per-clinic state. THEREFORE: if a problem happens at ONE clinic but not others, it is LOCAL (their device / browser / stored state / network) — not the platform. A platform problem would hit everyone.

Match the diagnostic to ONE of these known failure classes. Do NOT invent a cause the diagnostic doesn't support.

1. PRIVATE_MODE — storage_writable:false, or state shows "localStorage blocked". → Safari/Chrome private/incognito disables storage; work won't persist. Fix: reopen AllyOS in a NORMAL (non-private) window.
2. CORRUPT_STATE — a state entry flagged parse:"corrupt/not-json", or an implausible count (e.g. a chair stuck). → Fix: Download a backup first, then in the Dashboard restore a clean backup OR clear that one item and reload. (Never tell them to wipe the audit log or active floor without a backup.)
3. STORAGE_FULL — total state size large (any single key or sum near/over ~4500 KB). → localStorage quota near limit, writes can fail/freeze. Fix: archive or clear old audit data, then reload.
4. STALE_CACHE — built date is old, or behavior doesn't match the current build. → Fix: hard-reload (Cmd/Ctrl+Shift+R) to load the current version.
5. NETWORK_ALLY — recent_errors mention fetch/ask/inspect/timeout, or online:false. → Ally/AI calls are failing; the app can look frozen waiting on them. Fix: check Wi-Fi/connectivity; Ally features need internet, the core chairside works offline.
6. DATA_EDGE_BUG — a recent_error is a JS exception tied to specific state (TypeError/undefined). → Likely a real code bug triggered by their data; scope can be platform. Action: escalate to MD/dev with the error string.
7. UNKNOWN — symptoms don't map. Escalate to the MD.

Respond with ONLY a JSON object, nothing else:
{
 "likely_cause": "<class name or 'UNKNOWN'>",
 "scope": "local" | "platform",
 "confidence": "high" | "medium" | "low",
 "clinic_fix": "<plain 1-2 sentence action the clinic can do right now; '' if none>",
 "md_note": "<one line for the MD: what it is and whether it needs a code fix>",
 "severity": "low" | "medium" | "high"
}
Be honest: if the diagnostic doesn't support a cause, use UNKNOWN. Never recommend deleting data without a backup first.`;

exports.handler = async (event) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (event.httpMethod === "GET") return json(200, { ok: true, configured: !!key });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!key) return json(503, { error: "not_configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "Invalid JSON" }); }
  const diag = body.diagnostic || {};
  const message = (body.message || "").slice(0, 600);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 700,
        system: SYS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content:
          "Clinic message: " + (message || "(none)") +
          "\n\nDe-identified diagnostic:\n" + JSON.stringify(diag).slice(0, 6000) }],
      }),
    });
    if (!resp.ok) return json(502, { error: "upstream_error", status: resp.status });
    const out = await resp.json();
    const text = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const m = text.match(/\{[\s\S]*\}/);
    let triage = null;
    if (m) { try { triage = JSON.parse(m[0]); } catch (e) {} }
    return json(200, { triage });
  } catch (err) {
    return json(500, { error: "debug_failed", detail: String(err).slice(0, 200) });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
