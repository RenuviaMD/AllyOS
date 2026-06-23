#!/usr/bin/env python3
"""Build the public-facing Regulatory Compliance Database (like the Peptide Protocol
Portal's, but physician-curated/honest) from protocols.json + verified 2026 updates."""
import json, pathlib, html as H
ROOT = pathlib.Path(__file__).resolve().parent
data = json.load(open(ROOT / "protocols.json"))
peps = [p for p in data["protocols"] if not p["teaser"] and not p["is_stack"]]
esc = H.escape

# 6-category FDA regulatory taxonomy (verified from status + the 2026 Update Pack)
REG = {  # slug -> (category, 503A status, note)
 "semaglutide":("FDA-Approved","Restricted — essentially-a-copy","Wegovy/Ozempic/Rybelsus; shortage resolved 2025, 503A/503B enforcement resumed; MASH approval 2025"),
 "tirzepatide":("FDA-Approved","Restricted — essentially-a-copy","Zepbound/Mounjaro; OSA + HFpEF; compounding wound down 2025"),
 "liraglutide":("FDA-Approved","Restricted — essentially-a-copy","Victoza/Saxenda; generics 2024–25"),
 "tesamorelin":("FDA-Approved","Not bulk-listed","Egrifta WR (F8) approved Mar 2025; HIV lipodystrophy"),
 "pt-141":("FDA-Approved","Restricted (copy of Vyleesi)","Vyleesi (HSDD); compounded off-label restricted"),
 "ss-31":("FDA-Approved","Not bulk-listed","Elamipretide — FORZINITY approved Sep 2025 (Barth syndrome, accelerated)"),
 "retatrutide":("Investigational (IND)","Not eligible (IND)","Phase 3 (TRIUMPH); not approved"),
 "bpc-157":("Research Use Only","⚖ PCAC review Jul 23 2026","Removed from Category 2 Apr 2026; first Ph2 recruiting"),
 "tb-500":("Research Use Only","⚖ PCAC review Jul 23 2026","Tβ4 fragment; removed from Category 2 Apr 2026"),
 "kpv":("Research Use Only","⚖ PCAC review Jul 23 2026","Removed from Category 2 Apr 2026; no human trials"),
 "mots-c":("Research Use Only","⚖ PCAC review Jul 23 2026","Removed from Category 2 Apr 2026; first Ph2a recruiting"),
 "dsip":("Research Use Only","⚖ PCAC review Jul 24 2026","Emideltide; removed from Category 2 Apr 2026"),
 "semax":("Research Use Only","⚖ PCAC review Jul 24 2026","Removed from Category 2 Apr 2026; Russia-marketed"),
 "epitalon":("Research Use Only","⚖ PCAC review Jul 24 2026","Removed from Category 2 Apr 2026; zero human trials"),
 "ghk-cu":("Cosmetic Ingredient","Injectable removed from Cat 2 Apr 2026","Topical = cosmetic; injectable RUO; first topical Ph2 recruiting"),
 "melanotan-ii":("Research Use Only","Removed from Cat 2 Apr 2026","NOT afamelanotide; melanoma case reports"),
 "kisspeptin-10":("Research Use Only","PCAC declined 503A (Oct 2024)","Investigational; MGH/Imperial programs"),
 "ipamorelin":("Research Use Only","PCAC declined 503A (2024)","GI trials failed; no wellness data"),
 "cjc-1295":("Research Use Only","PCAC declined 503A (Dec 2024)","Only DAC form has human data"),
 "cjc-ipamorelin-blend":("Research Use Only","Components declined 503A","No human combination trials"),
 "aod-9604":("Research Use Only","PCAC declined 503A (Dec 2024)","Development halted; zero trials"),
 "thymosin-alpha-1":("Research Use Only (approved abroad)","PCAC declined 503A (Dec 2024)","Sepsis Ph3 (TESTS) negative 2025; Zadaxin abroad"),
 "cerebrolysin":("Research Use Only (approved abroad)","Not bulk-listed (import-alert)","Stroke RCT positive; preclinical retractions 2025–26"),
 "sermorelin":("Physician-grade / off-label","Not bulk-listed","Formerly approved (Geref, discontinued); compounded"),
 "gonadorelin":("Physician-grade / off-label","Category 1 (compounded)","Brands discontinued; compounded TRT-adjunct off-label"),
 "selank":("Research Use Only","Off Cat 2 (2024, withdrawn)","Not on Jul 2026 agenda; Russia-marketed"),
 "mk-677":("Research Use Only","Not bulk-listed","Oral; IGF-1 rise; splenic-rupture case report"),
 "ghrp-2":("Research Use Only","Not bulk-listed","Diagnostic abroad; no therapeutic approval"),
 "ghrp-6":("Research Use Only","Not bulk-listed","No human efficacy trials"),
 "hexarelin":("Research Use Only","Not bulk-listed","No therapeutic approval; tachyphylaxis"),
}
CATCOLOR = {"FDA-Approved":"g","Investigational (IND)":"y","Research Use Only":"r","Cosmetic Ingredient":"c","Physician-grade / off-label":"y"}
def catkey(c):
    for k in CATCOLOR:
        if c.startswith(k): return CATCOLOR[k]
    return "r"

rows = []
for p in sorted(peps, key=lambda x: x["name"]):
    cat, r503, note = REG.get(p["slug"], ("Research Use Only","—",p.get("primary_use","")))
    brand = ", ".join(p["brand_names"]) if p["brand_names"] else "—"
    rows.append({"name":p["name"],"cat":cat,"ck":catkey(cat),"brand":brand,"note":note,"r503":r503,"grade":p["grade"]})

UPDATES = [
 ("Apr 1 2026","Orforglipron (Foundayo™, Lilly) FDA-approved — first oral GLP-1; subjects it to 503A essentially-a-copy restriction.","https://investor.lilly.com/news-releases/news-release-details/fda-approves-lillys-foundayotm-orforglipron-only-glp-1-pill"),
 ("Jul 23–24 2026","FDA PCAC reviews 7 peptides for the 503A bulks list: BPC-157, KPV, TB-500, MOTS-c (Day 1) · DSIP, Semax, Epitalon (Day 2).","https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026"),
 ("Apr 16 2026","FDA removed 12 peptides from compounding Category 2 (FR Doc. 2026-07361). Removal ≠ approval to compound.","https://www.federalregister.gov/documents/2026/04/16/2026-07361/pharmacy-compounding-advisory-committee-notice-of-meeting-establishment-of-a-public-docket-request"),
 ("2025","Semaglutide & Tirzepatide off shortage list — 503A/503B compounding enforcement resumed; essentially-a-copy prohibited.","https://www.fda.gov/drugs/drug-shortages"),
]

CATS = ["FDA-Approved Drug — NDA/BLA-approved; off-label use permitted; copying requires 503A clinical justification.",
 "Investigational (IND) — active FDA IND, Phase 1–3; not for commercial sale or general prescribing.",
 "Research Use Only (RUO) — unapproved; no human-use claims; not eligible for standard 503A/B compounding.",
 "Cosmetic Ingredient — topical appearance use only; structure/function or disease claims reclassify as an unapproved drug; injectable forms remain RUO.",
 "Physician-grade / off-label — clinician-directed; classification at the ingredient level; structure-function labeling + informed consent."]

tr = "".join(f'''<tr data-cat="{r["ck"]}" data-s="{esc((r["name"]+" "+r["brand"]+" "+r["note"]).lower())}">
 <td class="nm">{esc(r["name"])}{(' · Grade '+r["grade"]) if r["grade"] else ''}</td>
 <td><span class="pill {r["ck"]}">{esc(r["cat"])}</span></td>
 <td class="br">{esc(r["brand"])}</td><td class="nt">{esc(r["note"])}</td>
 <td class="r5">{esc(r["r503"])}</td></tr>''' for r in rows)
ups = "".join(f'<li><span class="d">{esc(d)}</span> {esc(t)} <a href="{u}" target="_blank">source →</a></li>' for d,t,u in UPDATES)
defs = "".join(f"<li>{esc(c)}</li>" for c in CATS)
g = sum(1 for r in rows if r["ck"]=="g"); rr = sum(1 for r in rows if r["ck"]=="r")

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Regulatory Compliance Database — RenuviaMD®</title>
<style>
:root{{--navy:#102a30;--teal:#0e8a8a;--gold:#c9870a;--ink:#1c2b32;--muted:#5b6b72;--line:#e3ecea;--soft:#f3f8f7;--g:#1e9e6a;--y:#d98a00;--r:#d7483b;--c:#0e8a8a}}
*{{box-sizing:border-box;margin:0;padding:0}}body{{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.5}}
.wrap{{max-width:1100px;margin:0 auto;padding:0 22px}}
header{{background:linear-gradient(150deg,#0e3a40,#0e8a8a);color:#fff;padding:26px 0}}
.brand{{font-weight:800;letter-spacing:.02em}}.brand span{{color:#ffd98a}}
h1{{font-size:1.7rem;margin:14px 0 6px}}header p{{color:#d4ece9;max-width:680px}}
.bar{{background:var(--gold);color:#3a2a00;font-size:.82rem;font-weight:700;text-align:center;padding:7px}}
.stats{{display:flex;gap:14px;margin:18px 0;flex-wrap:wrap}}
.stat{{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 16px;text-align:center}}
.stat b{{display:block;font-size:1.5rem;color:var(--navy)}}.stat span{{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}}
.controls{{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}}
input{{flex:1;min-width:220px;border:1px solid var(--line);border-radius:9px;padding:10px 13px;font-size:.95rem}}
.fbtn{{border:1px solid var(--line);background:#fff;border-radius:8px;padding:9px 13px;font-size:.82rem;font-weight:600;color:var(--muted);cursor:pointer}}
.fbtn.on{{border-color:var(--teal);background:var(--soft);color:var(--navy)}}
table{{width:100%;border-collapse:collapse;font-size:.86rem;margin-top:6px}}
th{{text-align:left;border-bottom:2px solid var(--teal);padding:8px;color:var(--navy);font-size:.74rem;text-transform:uppercase;letter-spacing:.06em}}
td{{border-bottom:1px solid var(--line);padding:9px 8px;vertical-align:top}}
.nm{{font-weight:700;color:var(--navy);white-space:nowrap}}.br{{color:var(--muted)}}.nt{{color:var(--ink)}}.r5{{color:var(--navy);font-weight:600;white-space:nowrap}}
.pill{{font-size:.68rem;font-weight:800;padding:3px 8px;border-radius:6px;white-space:nowrap}}
.pill.g{{background:#e8f7f0;color:#0c7a4d}}.pill.y{{background:#fdf3e2;color:#9a6300}}.pill.r{{background:#fdecea;color:#b3372c}}.pill.c{{background:#e6f6f6;color:#0b6e6e}}
section{{padding:30px 0;border-top:1px solid var(--line)}}h2{{font-size:1.2rem;color:var(--navy);margin-bottom:12px}}
.updates li{{list-style:none;padding:10px 0;border-bottom:1px solid var(--line);font-size:.9rem}}.updates .d{{font-weight:800;color:var(--teal);margin-right:8px}}.updates a{{color:var(--teal)}}
.defs li{{list-style:none;padding:7px 0;border-bottom:1px solid var(--line);font-size:.86rem;color:var(--muted)}}
footer{{background:var(--navy);color:#9fb4b8;font-size:.78rem;padding:24px 0}}footer b{{color:#dfeae8}}
</style></head><body>
<div class="bar">📰 Apr 1 2026 — Orforglipron (Foundayo™) FDA-approved · Semaglutide &amp; Tirzepatide compounding restrictions in effect · PCAC reviews 7 peptides Jul 23–24</div>
<header><div class="wrap"><div class="brand">Renuvia<span>MD</span>® · Compliance Division</div>
<h1>Regulatory Compliance Database</h1>
<p>Physician-curated U.S. FDA regulatory classification for {len(rows)} peptides &amp; compounds — honestly graded, with 503A compounding status. Updated {data["meta"].get("count","")and ""}June 2026.</p></div></header>
<main class="wrap">
<div class="stats"><div class="stat"><b>{len(rows)}</b><span>Compounds</span></div>
<div class="stat"><b>{g}</b><span>FDA-approved</span></div><div class="stat"><b>{rr}</b><span>Research only</span></div></div>
<div class="controls"><input id="q" placeholder="Search compound, brand, or note…">
<button class="fbtn on" data-c="all">All</button><button class="fbtn" data-c="g">FDA-Approved</button>
<button class="fbtn" data-c="y">Investigational / Off-label</button><button class="fbtn" data-c="r">Research Only</button>
<button class="fbtn" data-c="c">Cosmetic</button></div>
<table><thead><tr><th>Compound</th><th>Category</th><th>Brand / Alt</th><th>Status &amp; Regulatory Notes</th><th>503A</th></tr></thead>
<tbody id="tb">{tr}</tbody></table>
<section><h2>Regulatory updates</h2><ul class="updates">{ups}</ul></section>
<section><h2>Understanding the categories</h2><ul class="defs">{defs}</ul></section>
</main>
<footer><div class="wrap"><b>Educational &amp; informational only — not legal or regulatory advice.</b> Classifications change; verify current FDA status at fda.gov. Research-Use-Only compounds are not approved for human administration. Practitioners are solely responsible for compliance with federal, state, and board requirements. © 2026 RenuviaMD® Compliance Division.</div></footer>
<script>
const tb=document.getElementById('tb'),rows=[...tb.querySelectorAll('tr')];let cat='all',q='';
function f(){{rows.forEach(r=>{{const okc=cat==='all'||r.dataset.cat===cat,okq=!q||r.dataset.s.includes(q);r.style.display=(okc&&okq)?'':'none';}});}}
document.getElementById('q').oninput=e=>{{q=e.target.value.toLowerCase();f();}};
document.querySelectorAll('.fbtn').forEach(b=>b.onclick=()=>{{cat=b.dataset.c;document.querySelectorAll('.fbtn').forEach(x=>x.classList.toggle('on',x===b));f();}});
</script></body></html>'''
(ROOT / "regulatory-database.html").write_text(html, encoding="utf-8")
print(f"Wrote regulatory-database.html — {len(rows)} compounds ({g} FDA-approved, {rr} research-only)")
