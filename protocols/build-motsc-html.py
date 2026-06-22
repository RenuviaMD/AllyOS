#!/usr/bin/env python3
"""Render the MOTS-c chapter into the premium Compendium format (HTML for Chrome->PDF).
Drops SECTION 7 (Legal & Regulatory) + the Legal-Risk field (per instruction); keeps
factual status; adds the verified 2026 PCAC/503A regulatory update.
"""
import re, pathlib, datetime, html as H

SRC = pathlib.Path("/root/.claude/uploads/40e9a562-92fb-5a7b-9a8a-9a28c1eedb00/c44d1912-Chapter_10_MOTSc.txt")
OUT = pathlib.Path(__file__).resolve().parent / "motsc-chapter.html"
TODAY = datetime.date.today().isoformat()
lines = SRC.read_text(encoding="utf-8").split("\n")
esc = H.escape

body, list_open = [], False
def close_list():
    global list_open
    if list_open: body.append("</ul>"); list_open = False
def li(item, cls=""):
    global list_open
    if not list_open: body.append("<ul>"); list_open = True
    body.append(f'<li class="{cls}">{esc(item)}</li>')

def emit_box(box):
    fields, cur, skipf = [], None, False
    for c in box:
        m = re.match(r"^([A-Z][A-Z /]+):\s*(.*)", c)
        if m:
            label = m.group(1).strip()
            if "LEGAL RISK" in label:      # DROP per instruction
                skipf, cur = True, None; continue
            skipf = False; cur = {"l": label, "v": m.group(2).strip(), "d": []}; fields.append(cur)
        elif c.lstrip().startswith("•") and cur and not skipf:
            cur["d"].append(c.lstrip("• ").strip())
    body.append('<div class="status">')
    for f in fields:
        det = "".join(f"<li>{esc(d)}</li>" for d in f["d"])
        body.append(f'<div class="sf"><span class="sl">{esc(f["l"])}</span>'
                     f'<span class="sv">{esc(f["v"])}</span><ul>{det}</ul></div>')
    body.append("</div>")
    # verified 2026 update right after the factual status box
    body.append('<div class="callout"><b>2026 Regulatory Update (verified — FDA advisory-committee calendar).</b> '
        'On <b>April 15, 2026</b> the FDA removed MOTS-c from the 503A Category 2 list. On '
        '<b>July 23–24, 2026</b> the FDA Pharmacy Compounding Advisory Committee (PCAC) reviews MOTS-c '
        '(free base and acetate) for the Section 503A bulk drug substances list — the decision will determine '
        'whether U.S. compounding pharmacies may legally dispense it. Recommendation is non-binding and is '
        'not FDA drug approval.</div>')

i, skip_sec, in_box, box = 0, False, False, []
# skip the chapter title block (handled in the header); start scanning after it
while i < len(lines):
    ln = lines[i].rstrip(); i += 1
    if "┌" in ln: in_box = True; box = []; continue
    if "└" in ln: in_box = False; emit_box(box); continue
    if in_box:
        c = ln.strip().strip("│").strip()
        if c: box.append(c)
        continue
    if re.match(r"^[═]{6,}$", ln.strip()): continue
    if re.match(r"^[─]{6,}$", ln.strip()): close_list(); continue
    m = re.match(r"^SECTION (\d+):\s*(.*)", ln)
    if m:
        close_list()
        if m.group(1) == "7": skip_sec = True; continue
        skip_sec = False
        body.append(f'<h2>{esc(m.group(2).title())}</h2>'); continue
    if skip_sec: continue
    if not ln.strip(): close_list(); continue
    if re.match(r"^\d+\.\d+[a-z]?\s+[A-Z]", ln):
        close_list(); t = re.sub(r"^\d+\.\d+[a-z]?\s+", "", ln); body.append(f"<h3>{esc(t)}</h3>"); continue
    if re.match(r"^(STEP|PEARL|FACTOR|MISTAKE|PRINCIPLE|LIABILITY RISK|CONTRAINDICATION|TARGET|REPORTED|RATIONALE|CRITICAL)\b.*[:#]", ln) or re.match(r"^[A-Z][A-Z0-9 ,/&'()\-]{4,}:$", ln.strip()):
        close_list(); body.append(f'<h4>{esc(ln.strip().rstrip(":"))}</h4>'); continue
    s = ln.strip()
    if s[:1] in ("✅","⚠","❌","•","□","✓","›","-"):
        cls = {"✅":"ok","⚠":"warn","❌":"no","□":"chk"}.get(s[:1],"")
        li(re.sub(r"^[✅⚠️❌•□✓›\-]\s*","",s), cls); continue
    if re.match(r"^[A-Z][A-Z0-9 ,/&'()\-]{6,}$", s):   # standalone caps label
        close_list(); body.append(f'<h4>{esc(s)}</h4>'); continue
    close_list(); body.append(f"<p>{esc(ln)}</p>")
close_list()
BODY = "\n".join(body)

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>MOTS-c — Clinical Protocol Monograph</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  :root{{--navy:#102a30;--navy2:#0e3a40;--teal:#0e8a8a;--gold:#c9870a;--ink:#1c2b32;--muted:#5b6b72;--line:#dbe6e4;--soft:#f3f8f7;--amber:#fff3df}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:Georgia,"Times New Roman",serif;color:var(--ink);line-height:1.5;font-size:10.5pt}}
  .doc{{padding:0 16mm}}
  .chead{{padding-top:6mm;border-bottom:1.5px solid var(--teal);padding-bottom:12px;margin-bottom:14px}}
  .eyebrow{{text-transform:uppercase;letter-spacing:.2em;font-size:8.5pt;color:var(--teal);margin-bottom:8px}}
  h1{{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:26pt;color:var(--navy);line-height:1.12}}
  .part{{font-size:10pt;color:var(--muted);font-style:italic;margin-top:6px}}
  .status{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;padding:12px 14px;background:var(--soft);border:1px solid var(--line);border-radius:8px}}
  .sf .sl{{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);font-weight:700}}
  .sf .sv{{font-family:"Playfair Display",Georgia,serif;font-size:11pt;color:var(--navy)}}
  .sf ul{{list-style:none;margin-top:3px}} .sf li{{font-size:8pt;color:var(--muted);padding-left:10px;position:relative}}
  .sf li::before{{content:"–";position:absolute;left:0}}
  h2{{font-family:"Playfair Display",Georgia,serif;font-size:17pt;color:var(--navy);margin:20px 0 8px;padding-bottom:5px;border-bottom:1.5px solid var(--teal);page-break-after:avoid}}
  h3{{font-family:"Playfair Display",Georgia,serif;font-size:12.5pt;color:var(--navy2);margin:14px 0 5px;page-break-after:avoid}}
  h4{{font-size:8.5pt;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin:11px 0 4px;page-break-after:avoid}}
  p{{margin:5px 0}} strong{{color:var(--navy2)}}
  ul{{list-style:none;margin:5px 0}}
  li{{padding:2px 0 2px 16px;position:relative}} li::before{{content:"•";position:absolute;left:4px;color:var(--teal)}}
  li.ok::before{{content:"✓";color:var(--teal)}} li.warn::before{{content:"!";color:var(--gold);font-weight:700}}
  li.no::before{{content:"✕";color:#b3372c}} li.chk::before{{content:"☐";left:0;color:var(--gold)}}
  .callout{{border-left:3px solid var(--gold);background:var(--amber);padding:10px 13px;margin:12px 0;font-size:9.5pt}}
  .callout b{{color:var(--navy)}}
</style></head>
<body><div class="doc">
  <div class="chead">
    <div class="eyebrow">The Peptide Compendium · 2026 Edition · Chapter 10</div>
    <h1>MOTS-c for Metabolic Health &amp; Longevity</h1>
    <div class="part">Part II · Weight Loss &amp; Metabolic Peptides — Mitochondrial Peptides</div>
  </div>
  {BODY}
</div></body></html>'''
OUT.write_text(html, encoding="utf-8")
print("Wrote", OUT.name, "·", len(BODY), "chars of body")
