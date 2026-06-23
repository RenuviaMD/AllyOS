#!/usr/bin/env python3
"""Generate the PREMIUM print PDF format (matching the MD Services Agreement design)
for the Compendium: a cover page + evidence-graded monographs. Chrome print -> PDF.
Output: protocols/compendium-pdf.html
"""
import json, re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent
data = json.load(open(ROOT / "protocols.json"))
peps = [p for p in data["protocols"] if not p["teaser"] and not p["is_stack"]]
TODAY = datetime.date.today().isoformat()

BADGE = {"green": "Grade A pathway", "yellow": "Physician-review", "red": "Research-only"}


def md(s):
    out, i, inlist = [], 0, False
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
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
            if lvl == 1: i += 1; continue   # peptide name handled in header
            out.append(f"<h{lvl+2}>{inline(m.group(2))}</h{lvl+2}>")
        elif re.match(r"^\s*-\s+", ln):
            if not inlist: out.append("<ul>"); inlist = True
            item = re.sub(r"^\s*-\s+", "", ln); cls = ""
            if item.startswith("☐"): cls = ' class="chk"'; item = item[1:].strip()
            out.append(f"<li{cls}>{inline(item)}</li>")
        else:
            close(); out.append(f"<p>{inline(ln)}</p>")
        i += 1
    close()
    return "".join(out)


def cites(p):
    if not p["citations"]: return ""
    items = "".join(
        (f'<li><a href="{c["url"]}">{c["label"]}</a></li>' if c["url"] else f'<li>{c["label"]}</li>')
        for c in p["citations"])
    return f'<h3>References</h3><ul class="cites">{items}</ul>'


def monograph(p, n):
    pcac = ""
    if p["fda_pcac"]:
        pcac = (f'<div class="callout amber"><b>FDA PCAC — {p["fda_pcac"]["date"]}.</b> Under Pharmacy '
                'Compounding Advisory Committee review for the 503A compounding list — non-binding, not FDA approval.</div>')
    return f'''
  <section class="mono">
    <div class="mono-head">
      <span class="mono-no">{n:02d}</span>
      <div><h2>{p["name"]}</h2>
        <div class="meta">{p["axis"]} · {p["status_label"]} · {"Grade "+p["grade"] if p["grade"] else ""} · {BADGE[p["classification"]]}</div></div>
    </div>
    {pcac}
    <div class="body">{md(p["body_md"])}
      {('<h3>Evidence</h3><p>'+p["evidence"]+'</p>') if p["evidence"] else ''}
      {cites(p)}
    </div>
    <div class="sigblock"><b>Reviewed &amp; approved — Medical Director:</b> ____________________________
      &nbsp; License # ____________ &nbsp; Signature ____________________ &nbsp; Date __________</div>
  </section>'''


monos = "".join(monograph(p, i + 1) for i, p in enumerate(peps))
toc = "".join(f'<li><span>{i+1:02d}</span> {p["name"]}<em>{("Grade "+p["grade"]) if p["grade"] else ""}</em></li>'
              for i, p in enumerate(peps))

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>The Peptide Desk Reference — 2026 Edition</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  :root{{--navy:#102a30;--navy2:#0e3a40;--teal:#0e8a8a;--gold:#c9870a;--ink:#1c2b32;--muted:#5b6b72;--line:#dbe6e4;--soft:#f3f8f7;--amber:#fff3df}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:Georgia,"Times New Roman",serif;color:var(--ink);line-height:1.5;font-size:10.5pt}}
  .serif{{font-family:"Playfair Display",Georgia,serif}}
  .page{{padding:0 14mm}}
  /* running header band + footer */
  .band{{position:running(hdr)}}
  @page{{size:letter;margin:22mm 0 20mm;
    @top-center{{content:element(hdr)}} @bottom-center{{content:element(ftr)}}}}
  .hdr{{position:running(hdr);width:100%;padding:0 14mm}}
  .hdrline{{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid var(--teal);padding-bottom:5px;font-size:8pt;color:var(--muted)}}
  .hdrline b{{font-family:"Playfair Display",Georgia,serif;font-size:11pt;color:var(--navy);letter-spacing:.02em}}
  .hdrline .r{{text-transform:uppercase;letter-spacing:.12em}}
  .ftr{{position:running(ftr);width:100%;padding:0 14mm;font-size:6.5pt;color:#777;text-align:center;border-top:1px solid var(--line);padding-top:5px}}
  .ftr b{{color:var(--teal)}}

  /* COVER */
  .cover{{height:235mm;display:flex;flex-direction:column;justify-content:space-between;text-align:center;page-break-after:always;padding:24mm 18mm}}
  .cover .top{{display:flex;justify-content:space-between;align-items:baseline;font-size:8.5pt;color:var(--muted);text-transform:uppercase;letter-spacing:.14em;border-bottom:1.5px solid var(--teal);padding-bottom:8px}}
  .cover .top b{{font-family:"Playfair Display",Georgia,serif;font-size:13pt;color:var(--navy);letter-spacing:.02em;text-transform:none}}
  .cover .mid{{margin-top:auto;margin-bottom:auto}}
  .cover .eyebrow{{text-transform:uppercase;letter-spacing:.28em;font-size:9pt;color:var(--teal);margin-bottom:22px}}
  .cover h1{{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:34pt;line-height:1.1;color:var(--navy);margin-bottom:18px}}
  .cover .sub{{font-size:13pt;color:var(--muted);font-style:italic;max-width:150mm;margin:0 auto}}
  .cover .rule{{width:60mm;height:2px;background:var(--gold);margin:26px auto}}
  .cover .by{{font-size:10.5pt;color:var(--ink)}} .cover .by b{{color:var(--navy)}}
  .cover .ed{{margin-top:14px;font-size:9pt;color:var(--muted);text-transform:uppercase;letter-spacing:.16em}}
  .cover .conf{{font-size:8pt;color:var(--muted);text-transform:uppercase;letter-spacing:.2em}}

  /* TOC */
  .toc{{page-break-after:always;padding:6mm 14mm}}
  .toc h2{{font-family:"Playfair Display",Georgia,serif;font-size:20pt;color:var(--navy);margin-bottom:14px;border-bottom:2px solid var(--teal);padding-bottom:8px}}
  .toc ul{{list-style:none;columns:2;column-gap:14mm;font-size:9.5pt}}
  .toc li{{padding:4px 0;border-bottom:1px dotted var(--line);display:flex;gap:8px;align-items:baseline}}
  .toc li span{{color:var(--teal);font-weight:700;font-variant-numeric:tabular-nums}}
  .toc li em{{margin-left:auto;color:var(--muted);font-style:normal;font-size:8pt}}

  /* MONOGRAPH */
  .mono{{page-break-before:always;padding:4mm 14mm}}
  .mono-head{{display:flex;gap:14px;align-items:flex-start;border-bottom:1.5px solid var(--teal);padding-bottom:10px;margin-bottom:12px}}
  .mono-no{{font-family:"Playfair Display",Georgia,serif;font-size:26pt;font-weight:800;color:var(--gold);line-height:1}}
  .mono-head h2{{font-family:"Playfair Display",Georgia,serif;font-size:19pt;color:var(--navy);line-height:1.1}}
  .mono-head .meta{{font-size:8.5pt;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:3px}}
  .body h4{{font-size:8pt;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);border-bottom:1px solid var(--line);padding-bottom:3px;margin:13px 0 6px}}
  .body h5{{font-size:10pt;color:var(--navy);margin:9px 0 3px}}
  .body p{{margin:5px 0}} .body strong{{color:var(--navy2)}}
  .body ul{{list-style:none;margin:5px 0}}
  .body li{{padding:2px 0 2px 16px;position:relative}} .body li::before{{content:"•";position:absolute;left:4px;color:var(--teal)}}
  .body li.chk::before{{content:"☐";left:0;color:var(--gold)}}
  table{{width:100%;border-collapse:collapse;margin:7px 0;font-size:8.5pt}}
  th,td{{border:1px solid var(--line);padding:5px 7px;text-align:left}} th{{background:var(--soft);color:var(--navy)}}
  .cites{{font-size:8pt}} .cites li::before{{content:"›"}} .cites a{{color:var(--teal)}}
  .callout{{border-left:3px solid var(--teal);background:var(--soft);padding:9px 12px;margin:10px 0;font-size:9pt}}
  .callout.amber{{border-left-color:var(--gold);background:var(--amber)}}
  .sigblock{{margin-top:16px;border-top:1px solid var(--line);padding-top:9px;font-size:8.5pt;color:var(--navy)}}
</style></head>
<body>

<!-- running header + footer (printed on every page via @page) -->
<div class="hdr"><div class="hdrline"><b>RenuviaMD®</b>
  <span class="r">Compliance Division · The Peptide Desk Reference · 2026 Edition</span></div></div>
<div class="ftr">For licensed healthcare professionals — educational &amp; clinical decision-support only. Not medical or legal advice, prescribing authorization, a standing order, delegation, clinic/pharmacy approval, or a medical-director relationship. Dated snapshot ({TODAY}) — verify current applicability. No resale or redistribution. · <b>RenuviaMD® Compliance Division</b></div>

<!-- COVER -->
<div class="cover">
  <div class="top"><b>RenuviaMD®</b><span>Compliance Division · v1.0 · {TODAY}</span></div>
  <div class="mid">
    <div class="eyebrow">Clinical Protocol Desk Reference · 2026 Edition</div>
    <h1>The Peptide Desk Reference<br>for Practitioners</h1>
    <div class="rule"></div>
    <p class="sub">{len(peps)} evidence-graded peptide protocols — physician-authored, fully cited, with reconstitution, monitoring, and ready-to-sign documentation.</p>
  </div>
  <div>
    <p class="by">Compiled &amp; edited by <b>Armando A. Falcon, M.D.</b> · FL License ME 84789 · RenuviaMD® PLLC</p>
    <p class="ed">2026 Edition · Version 1.0</p>
    <p class="conf" style="margin-top:30px">Confidential · Licensed to a single healthcare professional</p>
  </div>
</div>

<!-- TOC -->
<div class="toc"><h2>Contents</h2><ul>{toc}</ul></div>

{monos}
</body></html>'''

out = ROOT / "compendium-pdf.html"
out.write_text(html, encoding="utf-8")
print(f"Wrote {out.name}: cover + TOC + {len(peps)} premium monographs")
