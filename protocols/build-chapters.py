#!/usr/bin/env python3
"""Export ONE self-contained premium chapter-source HTML per peptide → protocols/chapters/<slug>.html
for design Claude to build/refine. Same design language as the MOTS-c template
(Playfair, navy/teal/gold, status strip, callouts, signature block)."""
import json, re, pathlib, datetime, html as H

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "chapters"; OUT.mkdir(exist_ok=True)
data = json.load(open(ROOT / "protocols.json"))
peps = [p for p in data["protocols"] if not p["teaser"] and not p["is_stack"]]
TODAY = datetime.date.today().isoformat()
esc = H.escape
BADGE = {"green": "FDA-approved pathway", "yellow": "Physician-review", "red": "Research-only / exclusion"}


def md(s):
    out, i, inlist = [], 0, False
    inline = lambda t: re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc(t))
    lines = s.split("\n")
    def close():
        nonlocal inlist
        if inlist: out.append("</ul>"); inlist = False
    while i < len(lines):
        ln = lines[i]
        if not ln.strip(): close(); i += 1; continue
        if ln.lstrip().startswith("|"):
            close(); rows = []
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                rows.append(lines[i]); i += 1
            rows = [r for r in rows if not re.match(r"^\s*\|[\s\-:|]+\|\s*$", r)]
            out.append("<table>")
            for ri, r in enumerate(rows):
                cells = [c.strip() for c in r.split("|")[1:-1]]
                tag = "th" if ri == 0 else "td"
                out.append("<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in cells) + "</tr>")
            out.append("</table>"); continue
        m = re.match(r"^(#{1,3})\s+(.*)", ln)
        if m:
            close(); lvl = len(m.group(1))
            if lvl == 1: i += 1; continue
            out.append(f"<h4>{inline(m.group(2))}</h4>")
        elif re.match(r"^\s*-\s+", ln):
            if not inlist: out.append("<ul>"); inlist = True
            item = re.sub(r"^\s*-\s+", "", ln); cls = ""
            if item.startswith("☐"): cls = ' class="chk"'; item = item[1:].strip()
            out.append(f"<li{cls}>{inline(item)}</li>")
        else:
            close(); out.append(f"<p>{inline(ln)}</p>")
        i += 1
    close(); return "".join(out)


def cites(p):
    if not p["citations"]: return ""
    items = "".join((f'<li><a href="{c["url"]}">{esc(c["label"])}</a></li>' if c["url"] else f'<li>{esc(c["label"])}</li>') for c in p["citations"])
    return f'<h4>References</h4><ul class="cites">{items}</ul>'


CSS = """:root{--navy:#102a30;--navy2:#0e3a40;--teal:#0e8a8a;--gold:#c9870a;--ink:#1c2b32;--muted:#5b6b72;--line:#dbe6e4;--soft:#f3f8f7;--amber:#fff3df}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;color:var(--ink);line-height:1.5;font-size:11pt}
.doc{max-width:190mm;margin:0 auto;padding:16mm}
.chead{border-bottom:1.5px solid var(--teal);padding-bottom:12px;margin-bottom:14px}
.eyebrow{text-transform:uppercase;letter-spacing:.2em;font-size:8.5pt;color:var(--teal);margin-bottom:8px}
h1{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:26pt;color:var(--navy);line-height:1.12}
.part{font-size:10pt;color:var(--muted);font-style:italic;margin-top:6px}
.status{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;padding:12px 14px;background:var(--soft);border:1px solid var(--line);border-radius:8px}
.sf .sl{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);font-weight:700}
.sf .sv{font-family:"Playfair Display",Georgia,serif;font-size:12pt;color:var(--navy)}
h4{font-size:8.5pt;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin:13px 0 5px;border-bottom:1px solid var(--line);padding-bottom:3px}
p{margin:5px 0}strong{color:var(--navy2)}ul{list-style:none;margin:5px 0}
li{padding:2px 0 2px 16px;position:relative}li::before{content:"•";position:absolute;left:4px;color:var(--teal)}
li.chk::before{content:"☐";left:0;color:var(--gold)}
table{width:100%;border-collapse:collapse;margin:7px 0;font-size:9pt}th,td{border:1px solid var(--line);padding:5px 7px;text-align:left}th{background:var(--soft);color:var(--navy)}
.cites a{color:var(--teal)}.callout{border-left:3px solid var(--gold);background:var(--amber);padding:10px 13px;margin:12px 0;font-size:10pt}
.sig{margin-top:18px;border-top:1px solid var(--line);padding-top:10px;font-size:9pt;color:var(--navy)}
.note{font-size:8pt;color:var(--muted);margin-top:14px;border-top:1px dashed var(--line);padding-top:8px}"""


for n, p in enumerate(peps, 1):
    pcac = (f'<div class="callout"><b>FDA PCAC — {p["fda_pcac"]["date"]}.</b> Under PCAC review for the 503A compounding list — non-binding, not FDA approval.</div>') if p["fda_pcac"] else ""
    grade = f'Grade {p["grade"]}' if p["grade"] else "—"
    html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(p["name"])} — Monograph</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><div class="doc">
<div class="chead"><div class="eyebrow">The Peptide Desk Reference · 2026 Edition · {p["axis"]}</div>
<h1>{esc(p["name"])}</h1><div class="part">{esc(p.get("primary_use",""))}</div></div>
<div class="status">
<div class="sf"><span class="sl">FDA Status</span><span class="sv">{esc(p["status_label"])}</span></div>
<div class="sf"><span class="sl">Evidence Grade</span><span class="sv">{grade}</span></div>
<div class="sf"><span class="sl">Classification</span><span class="sv">{BADGE[p["classification"]]}</span></div>
<div class="sf"><span class="sl">Liability</span><span class="sv">Prescriber assumes full risk</span></div>
</div>
{pcac}
<h4>Mechanism</h4><p>{esc(p.get("mechanism",""))}</p>
{('<h4>Clinical notes</h4><p>'+esc(p["clinical_notes"])+'</p>') if p.get("clinical_notes") else ''}
{md(p["body_md"])}
{('<h4>Evidence</h4><p>'+esc(p["evidence"])+'</p>') if p["evidence"] else ''}
{cites(p)}
<div class="sig"><b>Reviewed &amp; approved — Medical Director:</b> ____________________ · License # __________ · Signature ____________________ · Date __________</div>
<div class="note">RenuviaMD® Compliance Division · The Peptide Desk Reference 2026 Edition · generated {TODAY}. Educational/clinical decision-support for licensed professionals — not medical or legal advice, prescribing authorization, or a medical-director relationship. Dated snapshot; verify current applicability.</div>
</div></body></html>'''
    (OUT / f"{p['slug']}.html").write_text(html, encoding="utf-8")

print(f"Wrote {len(peps)} chapter files to protocols/chapters/")
