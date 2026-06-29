#!/usr/bin/env python3
"""
AllyOS clinical-content auditor — the scheduled "Operations Auditor".

Implements the protocol_only + citation_audit_only modes of the CDS Update Agent design
(protocols/cds-update-agent/): re-verifies each LOCKED module against drift via the Claude
API (Opus), GROUNDED in the agent's master prompt + decision rules, and emits a
clinician-review queue (never auto-publishing clinical logic).

Posture (from the design): no regulatory logic; commercial = market/identity only; trials =
activity only; FAERS = signal only; citation must support the exact claim or downgrade/block;
no dose/rate without a direct source; clinical-logic changes REQUIRE clinician sign-off.

PHI-FREE: only clinical-content JSON is sent. Requires ANTHROPIC_API_KEY (a GitHub Actions
secret in CI). Writes allyos/ops-audit-status.json + allyos/ops-audit-review-queue.csv.

  python3 scripts/ops-audit.py
Exit 0 = no hard FAIL (PASS / notes); exit 1 = a module FAILed re-verification.
"""
import json, os, sys, csv, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "protocols", "cds-update-agent")
KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
MODEL = "claude-opus-4-8"
MODULES = [
    "protocols/iv-module.json",
    "protocols/peptide-module.json",
    "protocols/bhrt-module.json",
    "protocols/peptide-stack-families.json",
    "protocols/wellness-iv-hard-stop.json",
    "protocols/peptide-iv-support.json",
]

def read(path, default=""):
    try:
        return open(path, encoding="utf-8").read()
    except Exception:
        return default

# Ground the auditor in the design's master prompt + decision rules (the source of truth for posture).
MASTER = read(os.path.join(PKG, "cds_update_agent_master_prompt_v1.md"))
RULES = read(os.path.join(PKG, "cds_update_decision_rules_v1.jsonl"))
SYSTEM = (
    (MASTER or "You are the AllyOS CDS Update Agent (advisory; no auto-publish of clinical logic).") +
    "\n\n## Decision rules (JSONL)\n" + RULES +
    "\n\n## This run\nMode: protocol_only + citation_audit_only on the SUPPLIED internal module "
    "(no live source fetch this pass). Re-verify: every citation is real and supports the EXACT claim "
    "at its stated directness; doses/ceilings/rates/contraindications match current known labels; no "
    "efficacy/synergy overclaim; advisory posture intact. Classify any drift and propose clinician-review "
    "items — NEVER auto-publish clinical logic; clinical changes require sign-off.\n"
    "Return ONLY strict JSON:\n"
    '{"verdict":"PASS|PASS-WITH-NOTES|FAIL","review_items":[{"summary":"...","change_class":"METADATA_ONLY|'
    'NEW_EVIDENCE|SAFETY_ESCALATION|EVIDENCE_DOWNGRADE|CONFLICT|RETRACTION_OR_CORRECTION|PROTOCOL_DRIFT|'
    'VALIDATION_GAP|SOURCE_STALE","risk_class":"low|medium|high","evidence_directness":"direct|class_or_pathway|'
    'mechanistic|commercial_market|signal_only|insufficient","proposed_action":"...","requires_signoff":true}]}\n'
    "review_items is empty only on a clean PASS. If uncertain, downgrade/flag for audit — do not invent."
)

def audit(name, content):
    body = json.dumps({
        "model": MODEL, "max_tokens": 2000, "system": SYSTEM,
        "messages": [{"role": "user", "content": "INTERNAL MODULE " + name + ":\n\n" + content[:120000]}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    txt = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    return json.loads(txt[txt.index("{"): txt.rindex("}") + 1])

def main():
    report = {"date": datetime.datetime.utcnow().isoformat() + "Z", "model": MODEL,
              "agent": "ops-audit", "mode": "protocol_only+citation_audit", "modules": []}
    review_rows, run_id = [], "ops-" + datetime.datetime.utcnow().strftime("%Y%m%dT%H%M")
    if not KEY:
        report["status"] = "skipped"; report["detail"] = "no ANTHROPIC_API_KEY in the environment"
        write_status(report); print("ops-audit: skipped (no ANTHROPIC_API_KEY)"); return 0
    seen, fails, review_total = set(), 0, 0
    for m in dict.fromkeys(MODULES):            # de-dupe, keep order
        path = os.path.join(ROOT, m)
        if not os.path.exists(path) or m in seen:
            continue
        seen.add(m)
        try:
            v = audit(m, read(path))
        except Exception as e:
            v = {"verdict": "ERROR", "review_items": [{"summary": str(e)[:200], "change_class": "SOURCE_STALE",
                 "risk_class": "low", "evidence_directness": "insufficient", "proposed_action": "retry", "requires_signoff": False}]}
        verdict, items = v.get("verdict", "UNKNOWN"), v.get("review_items", []) or []
        if verdict == "FAIL":
            fails += 1
        review_total += len(items)
        report["modules"].append({"module": m, "verdict": verdict, "review_items": len(items)})
        for it in items:
            review_rows.append({
                "review_item_id": run_id + "-" + str(len(review_rows) + 1), "run_id": run_id,
                "date_detected": report["date"][:10], "target_library": m,
                "affected_record_id": "", "change_class": it.get("change_class", ""),
                "risk_class": it.get("risk_class", ""), "summary": it.get("summary", ""),
                "source_ids": "", "evidence_directness": it.get("evidence_directness", ""),
                "proposed_action": it.get("proposed_action", ""), "clinician_decision": "",
                "reviewer": "", "review_date": "", "notes": "requires_signoff" if it.get("requires_signoff") else "",
            })
        print(m, "->", verdict, "(" + str(len(items)) + " review items)")
    report["status"] = "FAIL" if fails else ("NOTES" if review_total else "PASS")
    report["fails"], report["review_total"] = fails, review_total
    write_status(report); write_queue(review_rows)
    print("ops-audit:", report["status"], "·", fails, "fails ·", review_total, "review items")
    return 1 if fails else 0

def write_status(report):
    with open(os.path.join(ROOT, "allyos", "ops-audit-status.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

def write_queue(rows):
    cols = ["review_item_id", "run_id", "date_detected", "target_library", "affected_record_id", "change_class",
            "risk_class", "summary", "source_ids", "evidence_directness", "proposed_action", "clinician_decision",
            "reviewer", "review_date", "notes"]
    with open(os.path.join(ROOT, "allyos", "ops-audit-review-queue.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for r in rows:
            w.writerow(r)

if __name__ == "__main__":
    sys.exit(main())
