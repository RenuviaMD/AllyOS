#!/usr/bin/env python3
"""Generate the canonical protocol library dataset from the formulary frontmatter.

Outputs (single source of truth — other pages consume these):
  protocols/protocols.json   machine-readable, for any consumer
  protocols/protocols-data.js  window.RENUVIA_PROTOCOLS, for the static page (file:// safe)
"""
import json, pathlib, re, yaml

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
    # added monographs (provider-reference scope)
    "semaglutide": "green", "melanotan-ii": "red",
}

# For peptides not in the original reference doc, supply grade/evidence/citations here.
GRADE_OVERRIDE = {"semaglutide": "A", "melanotan-ii": "D"}
EVIDENCE_OVERRIDE = {
    "semaglutide": "Extensive Phase 3 program (SUSTAIN/STEP). FDA-approved for T2D, chronic weight management, and (2025) MASH with fibrosis; FLOW renal and SELECT cardiovascular outcomes positive.",
    "melanotan-ii": "No FDA approval; small/early efficacy data plus harm signals — case reports of melanoma and mucosal hyperpigmentation after use; nausea/flushing/priapism common. Distinct from FDA-approved afamelanotide.",
}
CITES_OVERRIDE = {
    "semaglutide": [
        {"label": "Sanyal 2025, NEJM (ESSENCE / MASH)", "url": "https://doi.org/10.1056/NEJMoa2413258"},
        {"label": "Perkovic 2024, NEJM (FLOW renal)", "url": "https://doi.org/10.1056/NEJMoa2403347"},
    ],
    "melanotan-ii": [
        {"label": "Oral mucosal melanoma after MT-II 2025, Int J Oral Maxillofac Surg", "url": "https://doi.org/10.1016/j.ijom.2025.03.014"},
    ],
}
STATUS_LABEL = {
    "fda_approved": "FDA-approved", "off_label": "Off-label",
    "investigational": "Investigational", "not_approved": "Research-only",
}

# FDA Pharmacy Compounding Advisory Committee (PCAC) — 503A bulk-list review, July 23–24, 2026.
# Verified via FDA advisory-committee calendar. This is a COMPOUNDING-eligibility review,
# non-binding, NOT FDA drug approval.
PCAC = {
    "bpc-157": 1, "kpv": 1, "tb-500": 1, "mots-c": 1,
    "dsip": 2, "semax": 2, "epitalon": 2,
}
PCAC_DATE = {1: "2026-07-23", 2: "2026-07-24"}

# Ordered (most-specific first) keyword -> slug, to map reference-doc titles to formulary slugs.
# Stack headings (23-29) contain component names, so match them FIRST to their stack slug.
REF_ALIASES = [
    ("wolverine", "wolverine-glow"), ("longevity —", "longevity-stack"),
    ("growth —", "growth-stack"), ("metabolic —", "metabolic-stack"),
    ("cognition —", "cognition-stack"), ("immunity —", "immunity-stack"),
    ("vitality —", "vitality-stack"),
    ("cjc-1295 + ipamorelin", "cjc-ipamorelin-blend"), ("cjc-1295 +", "cjc-ipamorelin-blend"),
    ("bpc-157", "bpc-157"), ("tb-500", "tb-500"), ("ghk-cu", "ghk-cu"),
    ("tirzepatide", "tirzepatide"), ("retatrutide", "retatrutide"), ("aod-9604", "aod-9604"),
    ("sermorelin", "sermorelin"), ("tesamorelin", "tesamorelin"), ("ipamorelin", "ipamorelin"),
    ("cjc-1295", "cjc-1295"), ("mots-c", "mots-c"), ("elamipretide", "ss-31"), ("ss-31", "ss-31"),
    ("epitalon", "epitalon"), ("cerebrolysin", "cerebrolysin"), ("semax", "semax"),
    ("selank", "selank"), ("dsip", "dsip"), ("emideltide", "dsip"), ("kpv", "kpv"),
    ("thymosin alpha", "thymosin-alpha-1"), ("thymosin α", "thymosin-alpha-1"),
    ("kisspeptin", "kisspeptin-10"), ("bremelanotide", "pt-141"), ("pt-141", "pt-141"),
]


def parse_reference(path):
    """Extract {slug: {grade, evidence, citations[]}} from the original reference doc."""
    if not path.exists():
        return {}
    out = {}
    blocks = path.read_text(encoding="utf-8").split("\n## ")
    for blk in blocks[1:]:
        lines = blk.split("\n")
        title = lines[0].lower()
        slug = next((s for kw, s in REF_ALIASES if kw in title), None)
        if not slug:
            continue
        gm = re.search(r"grade\s+([a-d][^·\n]*)", title)
        grade = gm.group(1).strip().rstrip(".").upper() if gm else ""
        evidence, cites = "", []
        for ln in lines[1:]:
            if ln.startswith("**Evidence:**"):
                evidence = ln.replace("**Evidence:**", "").strip()
            elif ln.startswith("- ") and ("http" in ln or "PMID" in ln):
                for piece in ln[2:].split(" · "):
                    piece = piece.strip()
                    if not piece:
                        continue
                    if " — " in piece:
                        label, url = piece.split(" — ", 1)
                    else:
                        label, url = piece, ""
                    label = label.replace("*", "").strip()
                    url = url.strip() if url.startswith("http") else ""
                    cites.append({"label": label, "url": url})
        if slug not in out:  # first (individual) entry wins over any later mention
            out[slug] = {"grade": grade, "evidence": evidence, "citations": cites}
    return out


REF = parse_reference(ROOT / "RenuviaMD-Peptide-Reference.md")


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

# Mark all formulary entries as full, and merge in grade/evidence/citations + PCAC flag.
for e in items:
    e["teaser"] = False
    r = REF.get(e["slug"], {})
    e["grade"] = r.get("grade") or GRADE_OVERRIDE.get(e["slug"], "")
    e["evidence"] = r.get("evidence") or EVIDENCE_OVERRIDE.get(e["slug"], "")
    e["citations"] = r.get("citations") or CITES_OVERRIDE.get(e["slug"], [])
    pd = PCAC.get(e["slug"])
    e["fda_pcac"] = {"day": pd, "date": PCAC_DATE[pd]} if pd else None

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
            "grade": "", "evidence": "", "citations": [], "fda_pcac": None,
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
