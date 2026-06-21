#!/usr/bin/env python3
"""Generate the canonical protocol library dataset from the formulary frontmatter.

Outputs (single source of truth — other pages consume these):
  protocols/protocols.json   machine-readable, for any consumer
  protocols/protocols-data.js  window.RENUVIA_PROTOCOLS, for the static page (file:// safe)
"""
import json, pathlib, yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
FORM = ROOT / "_research" / "formulary"
OUT = ROOT / "protocols"

# Honest red/yellow/green classification (authoritative — from the evidence audit).
CLASS = {
    # green = FDA-approved pathway
    "tirzepatide": "green", "tesamorelin": "green", "pt-141": "green",
    # yellow = physician-review-only (some human data / off-label / approved drug)
    "retatrutide": "yellow", "sermorelin": "yellow", "kisspeptin-10": "yellow",
    "ss-31": "yellow", "cerebrolysin": "yellow", "thymosin-alpha-1": "yellow",
    # red = research-only / exclusion
    "aod-9604": "red", "bpc-157": "red", "cjc-1295": "red",
    "cjc-ipamorelin-blend": "red", "dsip": "red", "epitalon": "red",
    "ghk-cu": "red", "ipamorelin": "red", "kpv": "red", "mots-c": "red",
    "selank": "red", "semax": "red", "tb-500": "red",
    # stacks
    "metabolic-stack": "yellow", "vitality-stack": "yellow", "immunity-stack": "yellow",
    "growth-stack": "red", "longevity-stack": "red", "cognition-stack": "red",
    "wolverine-glow": "red",
}
STATUS_LABEL = {
    "fda_approved": "FDA-approved", "off_label": "Off-label",
    "investigational": "Investigational", "not_approved": "Research-only",
}


def fm(path):
    txt = path.read_text(encoding="utf-8")
    if not txt.startswith("---"):
        return None
    block = txt.split("---", 2)[1]
    return yaml.safe_load(block)


def entry(path, is_stack):
    d = fm(path)
    if not d:
        return None
    ps = d.get("popup_summary", {}) or {}
    slug = d["slug"]
    # full 7-section prescribing-card body (everything after the frontmatter)
    txt = path.read_text(encoding="utf-8")
    parts = txt.split("---", 2)
    body = parts[2].strip() if len(parts) > 2 else ""
    return {
        "slug": slug,
        "name": d.get("name", slug),
        "brand_names": d.get("brand_names", []) or [],
        "line": "peptides",
        "axis": d.get("axis", ""),
        "status": d.get("status", ""),
        "status_label": STATUS_LABEL.get(d.get("status", ""), d.get("status", "")),
        "classification": CLASS.get(slug, "red"),
        "controlled": bool(d.get("controlled", False)),
        "is_stack": is_stack,
        "mechanism": ps.get("mechanism", ""),
        "primary_use": ps.get("primary_use", ""),
        "contraindications": ps.get("contraindications_short", ""),
        "clinical_notes": ps.get("clinical_notes_short", ""),
        "reviewed": (d.get("document_meta", {}) or {}).get("last_clinical_review", ""),
        "body_md": body,
    }


items = []
for p in sorted((FORM / "_individuals").glob("*.md")):
    e = entry(p, False)
    if e:
        items.append(e)
for p in sorted((FORM / "_stacks").glob("*.md")):
    e = entry(p, True)
    if e:
        items.append(e)

# Mark all formulary entries as full (real prescribing cards).
for e in items:
    e["teaser"] = False

# Title-only catalog teasers for the not-yet-built lines — names a provider
# recognizes, NO clinical content. These power the locked-tease / upsell view.
TEASERS = {
    "bhrt": [("Testosterone Cypionate", "green"), ("Testosterone + Anastrozole", "yellow"),
             ("Estradiol (Biest)", "green"), ("Progesterone", "green"), ("NDT / Thyroid", "yellow"),
             ("DHEA", "yellow"), ("Hormone Pellets (T/E)", "yellow")],
    "iv-nad": [("NAD+ Infusion", "yellow"), ("Myers' Cocktail", "yellow"), ("High-dose Vitamin C", "yellow"),
               ("Glutathione Push", "yellow"), ("Hydration + Electrolytes", "green"), ("Niagen IV (NR)", "yellow")],
    "glp": [("Semaglutide", "green"), ("Tirzepatide", "green"), ("Compounded Semaglutide", "yellow"),
            ("Liraglutide", "green"), ("B12 / MIC", "yellow")],
    "aesthetics": [("Botulinum Toxin", "green"), ("Dermal Filler (HA)", "green"), ("Microneedling + RF", "green"),
                   ("Laser / IPL", "green"), ("PRP", "yellow"), ("Kybella", "green")],
}
for line_id, names in TEASERS.items():
    for nm, cls in names:
        items.append({
            "slug": line_id + "-" + nm.lower().replace(" ", "-").replace("/", "").replace("(", "").replace(")", "").replace("+", "plus"),
            "name": nm, "brand_names": [], "line": line_id, "axis": "", "status": "",
            "status_label": "", "classification": cls, "controlled": False, "is_stack": False,
            "mechanism": "", "primary_use": "", "contraindications": "", "clinical_notes": "",
            "reviewed": "", "body_md": "",
            "teaser": True,
        })

# Lines of care: peptides populated now; the rest scaffolded (same structure, ready to fill).
lines = [
    {"id": "peptides", "name": "Peptides", "tagline": "Evidence-graded peptide protocols by clinical axis", "status": "active",
     "axes": ["Metabolism", "Growth", "Repair", "Vitality", "Longevity", "Cognition", "Immunity"]},
    {"id": "bhrt", "name": "BHRT", "tagline": "Bio-identical hormone replacement — male & female", "status": "in_development", "axes": []},
    {"id": "iv-nad", "name": "IV / NAD+", "tagline": "IV infusion & NAD+ (Niagen IV) protocols", "status": "in_development", "axes": []},
    {"id": "glp", "name": "GLP-1 / Metabolic", "tagline": "Medical weight management & metabolic", "status": "in_development", "axes": []},
    {"id": "aesthetics", "name": "Aesthetics / Devices", "tagline": "Injectables & energy-device protocols", "status": "in_development", "axes": []},
]

data = {
    "meta": {
        "title": "RenuviaMD Clinical Protocol Library",
        "curated_by": "Armando Falcon, MD",
        "tiers": {"1": "Curated, MD-signed library", "2": "On-demand peptide engine — verified, graduates into Tier 1"},
        "count": len(items),
    },
    "lines": lines,
    "protocols": items,
}

OUT.mkdir(exist_ok=True)
(OUT / "protocols.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
(OUT / "protocols-data.js").write_text(
    "/* Canonical protocol library — generated by build-data.py. Do not hand-edit. */\n"
    "window.RENUVIA_PROTOCOLS = " + json.dumps(data, indent=2) + ";\n", encoding="utf-8")

g = sum(1 for i in items if i["classification"] == "green")
y = sum(1 for i in items if i["classification"] == "yellow")
r = sum(1 for i in items if i["classification"] == "red")
print(f"Wrote {len(items)} protocols  (green {g} / yellow {y} / red {r})")
