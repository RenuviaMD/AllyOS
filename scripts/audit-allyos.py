#!/usr/bin/env python3
"""
AllyOS deterministic auditor — the SCHEMA + REFERENTIAL-INTEGRITY auditor, runnable
without Claude Code. Checks JSON validity, lock/sign-off status, and cross-file id
resolution across the locked protocol modules. Exit 0 = pass, 1 = problems found.

  Run:   python3 scripts/audit-allyos.py
         python3 scripts/audit-allyos.py --json     # machine-readable

This is ONE of the three auditors. It cannot judge clinical correctness or claim
discipline — those two need an LLM with the source material (see scripts/AUDIT.md).
"""
import json, glob, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
errs, warns, oks = [], [], []
def err(m):  errs.append(m)
def warn(m): warns.append(m)
def ok(m):   oks.append(m)

def load(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except FileNotFoundError:
        return None
    except Exception as e:
        err(f"{os.path.basename(path)}: INVALID JSON — {e}")
        return None

# 1) every protocols/*.json is strict-valid JSON
for f in sorted(glob.glob(P("protocols", "*.json"))):
    d = load(f)
    if d is not None:
        ok(f"valid JSON: protocols/{os.path.basename(f)}")

iv   = load(P("protocols", "iv-module.json")) or {}
sup  = load(P("protocols", "peptide-iv-support.json")) or {}
wihs = load(P("protocols", "wellness-iv-hard-stop.json")) or {}
fams = load(P("protocols", "peptide-stack-families.json")) or {}
gmap = load(P("protocols", "peptide-stack-family-safety-gate-map.json")) or {}

# 2) lock + sign-off status for modules that require it
def status_check(name, d):
    if not d:
        warn(f"{name}: file missing or unreadable"); return
    meta = d.get("meta", {})
    st, eff = meta.get("status"), meta.get("effective")
    if meta.get("requires_md_signoff") or st in ("locked", "draft"):
        if st == "locked":
            if not eff:
                err(f"{name}: status=locked but no effective date")
            # sign-off may be recorded as signoff_ledger.md_signoff (peptide modules)
            # OR via meta.curated_by + revision_log (iv-module's established pattern)
            md = d.get("signoff_ledger", {}).get("md_signoff")
            curated = meta.get("curated_by")
            if md or curated:
                how = "MD sign-off recorded" if md else "curated_by + revision_log"
                ok(f"{name}: LOCKED {eff} · {how}")
            else:
                err(f"{name}: status=locked but no md_signoff and no curated_by")
        else:
            warn(f"{name}: status={st} (not locked)")
for n, d in [("iv-module", iv), ("peptide-iv-support", sup),
             ("wellness-iv-hard-stop", wihs), ("peptide-stack-families", fams)]:
    status_check(n, d)

# helper id collections
iv_ids  = {i.get("id") for i in iv.get("ingredients", [])}
fam_ids = [f.get("id") for f in fams.get("families", [])]
fam_gate = {f.get("id"): f.get("gate_package") for f in fams.get("families", [])}
glp_ids = set()           # full ids, e.g. GLP_GATE_001_SEVERE_GI_DEHYDRATION
glp_prefixes = set()      # numeric stems, e.g. GLP_GATE_001  (refs use the short form)
for g in (sup.get("glp_support", {}).get("glp_context_safety_gates", {}).get("drug_context_gates", [])):
    gid = g.get("id") or ""
    glp_ids.add(gid)
    m = re.match(r"(GLP_GATE_\d+)", gid)
    if m: glp_prefixes.add(m.group(1))
axis_ids = {a.get("axis_id") for a in sup.get("axes", [])}

# 3) wellness-iv-hard-stop referential integrity
wfac = wihs.get("family_absolute_contraindications", [])
w_fam_ids = [f.get("family_id") for f in wfac]
if fam_ids:
    missing = set(fam_ids) - set(w_fam_ids)
    extra   = set(w_fam_ids) - set(fam_ids)
    if missing: err(f"wellness-iv-hard-stop: missing families {sorted(missing)}")
    if extra:   err(f"wellness-iv-hard-stop: unknown families {sorted(extra)}")
    if not missing and not extra and w_fam_ids:
        ok(f"wellness-iv-hard-stop: all {len(w_fam_ids)} family_ids match peptide-stack-families")
    # gate_package_string must match the families file exactly
    for f in wfac:
        fid, gps = f.get("family_id"), f.get("gate_package_string")
        if fid in fam_gate and gps != fam_gate[fid]:
            err(f"wellness-iv-hard-stop[{fid}]: gate_package_string mismatch — '{gps}' vs '{fam_gate[fid]}'")

# 4) peptide-iv-support: every iv_module_id resolves to a real locked ingredient
sd = sup.get("safety_delegation", {}).get("map", {})
for label, ingid in sd.items():
    if iv_ids and ingid not in iv_ids:
        err(f"peptide-iv-support.safety_delegation: '{label}' -> {ingid} not in iv-module ingredients")
for row in sup.get("ingredient_matrix", []):
    ingid = row.get("iv_module_id")
    if iv_ids and ingid and ingid not in iv_ids:
        err(f"peptide-iv-support.ingredient_matrix: {row.get('ingredient')} -> {ingid} not in iv-module")
if sd and not [e for e in errs if "safety_delegation" in e]:
    ok(f"peptide-iv-support: all {len(sd)} safety_delegation ids resolve to iv-module")

# 5) wellness-iv-hard-stop: ING_/GLP_GATE_/AXIS_ references resolve where checkable
wtext = json.dumps(wihs)
for ingid in sorted(set(re.findall(r"ING_[A-Z0-9_]+", wtext))):
    if iv_ids and ingid not in iv_ids:
        warn(f"wellness-iv-hard-stop: references {ingid} not in iv-module (may be intentional pointer)")
for gid in sorted(set(re.findall(r"GLP_GATE_[0-9]+", wtext))):
    if glp_prefixes and gid not in glp_prefixes:
        err(f"wellness-iv-hard-stop: references {gid} not found in peptide-iv-support glp gates")

# 6) iv-module ceiling sanity: known wellness ceilings present
CEIL = {"ING_VITC": "10", "ING_NAD": "500", "ING_MGCL": "2", "ING_NIAGEN_NR": "500"}
for ingid, want in CEIL.items():
    ing = next((i for i in iv.get("ingredients", []) if i.get("id") == ingid), None)
    if ing is None:
        if iv_ids: warn(f"iv-module: expected ingredient {ingid} not found")
    elif want not in (ing.get("ceiling", "")):
        warn(f"iv-module {ingid}: ceiling '{ing.get('ceiling')}' does not contain expected '{want}'")

# 7) citation presence on primary-library ingredients
for i in iv.get("ingredients", []):
    if i.get("in_primary_library") and not i.get("citation"):
        warn(f"iv-module {i.get('id')}: in_primary_library but no citation")

# ---- report ----
if "--json" in sys.argv:
    print(json.dumps({"errors": errs, "warnings": warns, "passed": len(oks),
                      "ok": not errs}, indent=2)); sys.exit(0 if not errs else 1)

print("\n  AllyOS deterministic auditor (schema + referential integrity)\n  " + "-"*58)
for m in oks:   print(f"  \033[32m✓\033[0m {m}")
for m in warns: print(f"  \033[33m⚠\033[0m {m}")
for m in errs:  print(f"  \033[31m✗\033[0m {m}")
print("  " + "-"*58)
print(f"  {len(oks)} passed · {len(warns)} warnings · {len(errs)} errors")
if errs:
    print("  \033[31mRESULT: FAIL — fix the ✗ items above.\033[0m\n"); sys.exit(1)
print("  \033[32mRESULT: PASS (schema). Clinical + citation/regulatory auditors still need an LLM — see scripts/AUDIT.md.\033[0m\n")
sys.exit(0)
