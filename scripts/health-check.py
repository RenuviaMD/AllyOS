#!/usr/bin/env python3
"""AllyOS Debug/Health agent (deterministic, no API).
Validates every data file as JSON, sanity-checks the reconstitution math, and
writes allyos/admin-status.json for the Master Console. Exits non-zero on any error.
"""
import json, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = [
    "pricing.json",
    "protocols/protocols.json",
    "protocols/peptide-packs.json",
    "protocols/intake-schema.json",
    "protocols/contraindications.json",
    "protocols/protocols-detail.json",
]
errors, checked = [], []

for rel in DATA:
    fp = os.path.join(ROOT, rel)
    if not os.path.exists(fp):
        errors.append("MISSING: " + rel); continue
    try:
        json.load(open(fp, encoding="utf-8")); checked.append(rel)
    except Exception as e:
        errors.append("INVALID JSON: %s — %s" % (rel, e))

def recon(mg, ml, dose):           # mg/mL -> mcg/mL -> mL/dose -> U-100 units
    return (dose / ((mg / ml) * 1000)) * 100

for (mg, ml, dose), exp in [((5, 2, 250), 10.0), ((10, 1, 5000), 50.0), ((12, 1.2, 2000), 20.0)]:
    got = round(recon(mg, ml, dose), 1)
    if abs(got - exp) > 0.05:
        errors.append("CALC: %smg+%smL %smcg -> %su (expected %s)" % (mg, ml, dose, got, exp))

status = {
    "date": datetime.datetime.utcnow().isoformat() + "Z",
    "json_valid": len([e for e in errors if "JSON" in e or "MISSING" in e]) == 0,
    "calc_ok": len([e for e in errors if e.startswith("CALC")]) == 0,
    "files_checked": checked,
    "errors": errors,
    "agent": "health-check",
}
os.makedirs(os.path.join(ROOT, "allyos"), exist_ok=True)
json.dump(status, open(os.path.join(ROOT, "allyos", "admin-status.json"), "w"), indent=2)
print(json.dumps(status, indent=2))
sys.exit(1 if errors else 0)
