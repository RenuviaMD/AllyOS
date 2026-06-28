#!/usr/bin/env python3
"""AllyOS Debug/Health agent — the dev/CI debugger (deterministic, no API).

Audits the whole AllyOS codebase and writes allyos/admin-status.json for the
Master Console. ERRORS fail CI (exit 1); WARNINGS are reported but don't fail.

Checks:
  1. Every JSON data file parses.
  2. Every inline <script> in allyos/*.html parses (via scripts/check-js.js).
  3. Every Netlify function parses.
  4. Reconstitution math is correct.
  5. Internal links/assets in allyos/*.html exist            (warning).
  6. Protocol components resolve to a known ingredient        (warning).
"""
import json, os, sys, re, glob, datetime, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = ("node_modules", ".git", "app-bioaxisos", "dist", "build")
errors, warnings, checked = [], [], []

def rel(p): return os.path.relpath(p, ROOT)
def walk(*dirs, ext=".json"):
    out = []
    for d in dirs:
        base = os.path.join(ROOT, d)
        for dp, dn, fn in os.walk(base):
            dn[:] = [x for x in dn if x not in SKIP_DIRS]
            for f in fn:
                if f.endswith(ext):
                    out.append(os.path.join(dp, f))
    return sorted(out)

# ---- 1 · JSON validity (auto-discovered) ----
json_files = walk("protocols", "allyos", "ally", ext=".json") + sorted(glob.glob(os.path.join(ROOT, "*.json")))
for fp in json_files:
    try:
        json.load(open(fp, encoding="utf-8")); checked.append(rel(fp))
    except Exception as e:
        errors.append("INVALID JSON: %s — %s" % (rel(fp), e))

# ---- 2 + 3 · JS syntax (HTML inline scripts + Netlify functions) via node ----
def node_check(fp):
    try:
        r = subprocess.run(["node", os.path.join(ROOT, "scripts", "check-js.js"), fp],
                           capture_output=True, text=True, timeout=60)
        return r.returncode == 0, r.stdout.strip()
    except FileNotFoundError:
        return None, "node not available"
    except Exception as e:
        return False, str(e)

js_targets = walk("allyos", ext=".html") + walk("netlify", ext=".js")
js_ok = True
for fp in js_targets:
    ok, out = node_check(fp)
    if ok is None:
        warnings.append("JS check skipped (node missing): " + rel(fp)); continue
    if ok:
        checked.append(rel(fp))
    else:
        js_ok = False
        for line in (out or "").splitlines():
            if line.startswith("JSERR"):
                errors.append("JS SYNTAX: " + line[6:])

# ---- 4 · reconstitution math (mg/mL -> mcg/mL -> mL/dose -> U-100 units) ----
def recon(mg, ml, dose): return (dose / ((mg / ml) * 1000)) * 100
for (mg, ml, dose), exp in [((5, 2, 250), 10.0), ((10, 1, 5000), 50.0), ((12, 1.2, 2000), 20.0)]:
    got = round(recon(mg, ml, dose), 1)
    if abs(got - exp) > 0.05:
        errors.append("CALC: %smg+%smL %smcg -> %su (expected %s)" % (mg, ml, dose, got, exp))

# ---- 5 · internal links / assets in allyos/*.html (warning) ----
LINK_RE = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
SKIP_LINK = ("http://", "https://", "//", "#", "mailto:", "tel:", "data:", "javascript:")
for fp in walk("allyos", ext=".html"):
    html = open(fp, encoding="utf-8", errors="ignore").read()
    # strip <script>/<style> so JS string literals aren't mistaken for links
    html = re.sub(r'<script[\s\S]*?</script>', '', html, flags=re.I)
    html = re.sub(r'<style[\s\S]*?</style>', '', html, flags=re.I)
    seen = set()
    for ref in LINK_RE.findall(html):
        ref0 = ref.split("?")[0].split("#")[0].strip()
        if not ref0 or ref0.startswith(SKIP_LINK) or ref0 in seen:
            continue
        seen.add(ref0)
        target = os.path.normpath(os.path.join(os.path.dirname(fp), ref0))
        if not os.path.exists(target):
            warnings.append("BROKEN LINK: %s -> %s" % (rel(fp), ref0))

# ---- 6 · protocol components resolve to a known ingredient (warning) ----
def names_from(mod):
    s = set()
    for i in (mod.get("ingredients") or []):
        if i.get("name"): s.add(i["name"].lower())
        for a in (i.get("aliases") or []): s.add(a.lower())
    return s
try:
    iv = json.load(open(os.path.join(ROOT, "protocols", "iv-module.json"), encoding="utf-8"))
    ing = names_from(iv)
    try:
        drafts = json.load(open(os.path.join(ROOT, "protocols", "draft-additions.json"), encoding="utf-8"))
        ing |= names_from(drafts)
    except Exception:
        pass
    def resolves(comp):
        c = (comp or "").lower()
        return any(c == n or c.startswith(n.split(" (")[0]) or n.startswith(c.split(" (")[0]) for n in ing if n)
    for st in (iv.get("stacks") or []):
        for comp in (st.get("components") or []):
            nm = comp.get("ingredient", "")
            if nm and not resolves(nm):
                warnings.append("UNRESOLVED INGREDIENT: %s in stack %s" % (nm, st.get("code", "?")))
except Exception as e:
    warnings.append("ingredient-resolution check skipped: " + str(e))

# ---- write status ----
status = {
    "date": datetime.datetime.utcnow().isoformat() + "Z",
    "json_valid": len([e for e in errors if "JSON" in e]) == 0,
    "js_ok": js_ok,
    "calc_ok": len([e for e in errors if e.startswith("CALC")]) == 0,
    "files_checked": len(checked),
    "checks": {"json": len(json_files), "js": len(js_targets)},
    "errors": errors,
    "warnings": warnings,
    "agent": "health-check",
}
os.makedirs(os.path.join(ROOT, "allyos"), exist_ok=True)
json.dump(status, open(os.path.join(ROOT, "allyos", "admin-status.json"), "w"), indent=2)
print(json.dumps(status, indent=2))
print("\n%d errors, %d warnings, %d files checked" % (len(errors), len(warnings), len(checked)))
sys.exit(1 if errors else 0)
