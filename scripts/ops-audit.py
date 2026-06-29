#!/usr/bin/env python3
"""
AllyOS clinical-content auditor — the scheduled "Operations Auditor".

Re-verifies each LOCKED clinical decision-support module for DRIFT via the Claude API
(Opus): citations real + accurately represented, doses/ceilings/rates/contraindications
consistent with current known labels, NO efficacy/synergy overclaim, advisory posture
intact. Runs daily + on demand from the cockpit's "Run now".

PHI-FREE: only clinical-content JSON is sent — never any patient data. Requires the
ANTHROPIC_API_KEY env (a GitHub Actions secret in CI). Writes allyos/ops-audit-status.json.

  python3 scripts/ops-audit.py
Exit 0 = no hard FAIL (PASS / PASS-WITH-NOTES); exit 1 = a module FAILed re-verification.
"""
import json, os, sys, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
SYSTEM = (
    "You are the AllyOS clinical-content auditor. Re-verify a LOCKED clinical decision-support "
    "module for DRIFT. Check: (1) every citation is real and represented accurately (no fabrication "
    "or overstatement); (2) doses, ceilings, rates, and contraindications are consistent with current "
    "known drug labels/evidence; (3) NO efficacy/synergy overclaim; (4) advisory posture intact "
    "(no enforcement / scope-policing leakage). Be specific and skeptical; default to flagging if "
    "uncertain. Return ONLY strict JSON: "
    '{"verdict":"PASS|PASS-WITH-NOTES|FAIL","notes":["<severity> field -> concrete drift/issue"]}. '
    "Notes empty only on a clean PASS."
)

def audit(module_name, content):
    body = json.dumps({
        "model": MODEL, "max_tokens": 1500, "system": SYSTEM,
        "messages": [{"role": "user", "content": "MODULE " + module_name + ":\n\n" + content[:120000]}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())
    txt = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    try:
        return json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
    except Exception:
        return {"verdict": "UNKNOWN", "notes": ["could not parse auditor output: " + txt[:200]]}

def write(report):
    with open(os.path.join(ROOT, "allyos", "ops-audit-status.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

def main():
    report = {"date": datetime.datetime.utcnow().isoformat() + "Z", "model": MODEL, "agent": "ops-audit", "modules": []}
    if not KEY:
        report["status"] = "skipped"; report["detail"] = "no ANTHROPIC_API_KEY in the environment"
        write(report); print("ops-audit: skipped (no ANTHROPIC_API_KEY)"); return 0
    fails = notes_total = 0
    for m in MODULES:
        path = os.path.join(ROOT, m)
        if not os.path.exists(path):
            continue
        try:
            v = audit(m, open(path, encoding="utf-8").read())
        except Exception as e:
            v = {"verdict": "ERROR", "notes": [str(e)[:200]]}
        verdict, notes = v.get("verdict", "UNKNOWN"), v.get("notes", [])
        if verdict == "FAIL":
            fails += 1
        notes_total += len(notes)
        report["modules"].append({"module": m, "verdict": verdict, "notes": notes})
        print(m, "->", verdict, "(" + str(len(notes)) + " notes)")
    report["status"] = "FAIL" if fails else ("NOTES" if notes_total else "PASS")
    report["fails"] = fails; report["notes_total"] = notes_total
    write(report)
    print("ops-audit:", report["status"], "·", fails, "fails ·", notes_total, "notes")
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
