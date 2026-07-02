#!/usr/bin/env python3
"""
AllyOS Regulatory Radar — INFO ONLY. Awareness of peptide/compounding regulatory news.

IMPORTANT: this is purely informational. It does NOT touch protocol logic, gates, doses, or
any decision. It surfaces headlines + official links + dates so the MD can read primary
sources. It is walled off from the deterministic Change Sentinel by design.

Federal lane only (automated): the Federal Register API (free, no key) — FDA notices, Pharmacy
Compounding Advisory Committee (PCAC) meetings, §503A/§503B bulk-substance actions, peptide rules.
(No state/Florida lane — kept to the federal level by design.)

Optionally tags an item when it mentions an agent that's in our peptide library — still info-only.

  python3 scripts/reg-radar.py
Writes allyos/reg-radar.json. Exit 0 always (news is never a build failure).
"""
import json, os, re, sys, time, urllib.request, urllib.parse, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Federal Register search terms (FDA agency) — peptide + compounding regulatory activity.
FED_TERMS = ["peptide", "Pharmacy Compounding Advisory Committee", "503A bulk drug substances", "503B bulk"]

# Library peptide agents (for the optional 'mentions our agent' info tag). Static + module-derived.
PEPTIDE_SEED = ["BPC-157", "TB-500", "KPV", "MOTS-c", "Epitalon", "Semax", "Selank", "DSIP", "GHK-Cu",
                "Tesamorelin", "CJC-1295", "Sermorelin", "Ipamorelin", "AOD-9604", "PT-141", "bremelanotide",
                "Kisspeptin", "retatrutide", "semaglutide", "tirzepatide", "SS-31", "elamipretide", "Emideltide"]

def library_agents():
    """Seed list + the ACTUAL agent/ingredient names found in the locked peptide modules,
    so a library-only peptide (not in the static seed) still gets the info tag."""
    agents = set(a.lower() for a in PEPTIDE_SEED)
    NAME_KEYS = ("name", "agent", "ingredient", "peptide")

    def collect(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if k in NAME_KEYS and isinstance(v, str):
                    n = re.sub(r"\(.*?\)|[®™]", "", v).strip().lower()
                    if 3 <= len(n) <= 40:
                        agents.add(n)
                collect(v)
        elif isinstance(node, list):
            for v in node:
                collect(v)

    for mod in ("peptide-module", "peptide-stack-families", "peptide-iv-support"):
        p = os.path.join(ROOT, "protocols", mod + ".json")
        try:
            collect(json.load(open(p, encoding="utf-8")))
        except Exception:
            continue
    return agents

def _get(url, timeout=30):
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "AllyOS-reg-radar/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def federal_register(term, since):
    base = "https://www.federalregister.gov/api/v1/documents.json?"
    q = [("conditions[term]", term), ("conditions[agencies][]", "food-and-drug-administration"),
         ("conditions[publication_date][gte]", since), ("per_page", "20"), ("order", "newest"),
         ("fields[]", "title"), ("fields[]", "publication_date"), ("fields[]", "html_url"),
         ("fields[]", "type"), ("fields[]", "document_number"), ("fields[]", "abstract")]
    return _get(base + urllib.parse.urlencode(q)).get("results", []) or []

def main():
    agents = library_agents()
    since = (datetime.date.today() - datetime.timedelta(days=365)).strftime("%Y-%m-%d")
    seen, federal, unverified = {}, [], []
    for term in FED_TERMS:
        try:
            for d in federal_register(term, since):
                dn = d.get("document_number")
                if not dn or dn in seen:
                    continue
                text = ((d.get("title") or "") + " " + (d.get("abstract") or "")).lower()
                hits = sorted(set(a for a in agents if a in text))
                seen[dn] = True
                federal.append({"title": d.get("title", ""), "date": d.get("publication_date", ""),
                                "url": d.get("html_url", ""), "type": d.get("type", ""),
                                "mentions_library": hits})
        except Exception as e:
            unverified.append("federal_register:" + term + ": " + str(e)[:80])
        time.sleep(0.4)
    federal.sort(key=lambda x: x.get("date", ""), reverse=True)

    report = {"date": datetime.datetime.utcnow().isoformat() + "Z", "agent": "reg-radar",
              "mode": "INFO ONLY — federal-level awareness; does NOT affect protocol logic or decisions",
              "scope": "federal_only",
              "federal": federal[:40],
              "total_federal": len(federal), "unverified": unverified,
              "status": "ok" if federal or not unverified else "unverified"}
    with open(os.path.join(ROOT, "allyos", "reg-radar.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print("reg-radar:", len(federal), "federal item(s),", len(unverified), "unverified · federal-only")
    return 0

if __name__ == "__main__":
    sys.exit(main())
