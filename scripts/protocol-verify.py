#!/usr/bin/env python3
"""
AllyOS protocol verifier — the PRODUCTIVITY auditor.

Scope (per the owner's direction): only PUBLISHED protocols (in_primary_library:true,
locked) — NOT pending/draft/market_additions. For each published protocol it:

  1. VERIFIES every citation by RESOLVING it live (DOI / PMID / NCT) — deterministic,
     no LLM, no API key. A citation that resolves is AUTO-CONFIRMED and never reaches a
     human. Only citations that FAIL to resolve land in the short review queue.
  2. Reports WHAT'S NEW per protocol — recent PubMed papers + ClinicalTrials updates for
     that protocol's own agents (mapped to the protocol, not one global watch list).

This is the opposite of a 41-item manual pile: the machine does 100% of the verification
legwork and surfaces only the irreducible few. Clinical LOGIC is never auto-changed —
this only confirms that what's published is real and flags what isn't.

  python3 scripts/protocol-verify.py
Writes allyos/protocol-verify.json + allyos/protocol-verify-queue.csv.
Exit 0 = no failed citations; exit 1 = at least one published citation failed to resolve.
"""
import json, os, re, sys, csv, time, urllib.request, urllib.parse, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULES = ["iv-module", "peptide-module", "bhrt-module",
           "peptide-stack-families", "peptide-iv-support", "wellness-iv-hard-stop"]

DOI_RE = re.compile(r'10\.\d{4,9}/[^\s"\\,;)\]]+')
PMID_RE = re.compile(r'PMID[:\s]*([0-9]{6,9})')
NCT_RE = re.compile(r'NCT\d{8}')

# ---------------------------------------------------------------- published scope
def is_pending(node):
    """A node is PENDING (skip) if it's draft / market-addition / not in the primary library."""
    if not isinstance(node, dict):
        return False
    if node.get("in_primary_library") is False:
        return True
    st = str(node.get("status", ""))
    if "DRAFT" in st.upper() or "market_addition" in st:
        return True
    return False

def protocol_units(name, data):
    """Yield published 'protocol units' (stacks / ingredients / families) carrying citations or agents."""
    units = []

    def agents_of(node):
        out = []
        comps = node.get("components") or node.get("ingredients") or node.get("recipe") or []
        if isinstance(comps, list):
            for c in comps:
                if isinstance(c, dict):
                    a = c.get("ingredient") or c.get("name") or c.get("agent")
                    if a:
                        out.append(a)
                elif isinstance(c, str):
                    out.append(c)
        if not out:
            nm = node.get("name") or node.get("title")
            if nm:
                out.append(nm)
        return out

    def ids_of(node):
        blob = json.dumps(node)
        return {
            "dois": sorted(set(d.rstrip(".;,") for d in DOI_RE.findall(blob))),
            "pmids": sorted(set(PMID_RE.findall(blob))),
            "ncts": sorted(set(NCT_RE.findall(blob))),
        }

    def cites_of(node):
        out = []
        for k in ("citation", "citations", "source", "sources"):
            v = node.get(k)
            if isinstance(v, str):
                out.append(v)
            elif isinstance(v, list):
                out += [x for x in v if isinstance(x, str)]
        return sorted(set(out))

    def walk(node, container=""):
        if isinstance(node, dict):
            label = node.get("code") or node.get("title") or node.get("name") or node.get("id")
            has_cite = any(k in node for k in ("citation", "citations", "source", "sources"))
            has_comp = "components" in node
            # a unit = a named node that is a stack/ingredient/family with citations or a recipe,
            # in a PUBLISHED, non-pending container (skip market_additions entirely)
            if label and (has_cite or has_comp) and not is_pending(node) and "market_addition" not in container:
                published = node.get("in_primary_library") is True or node.get("in_primary_library") is None
                if published:
                    ids = ids_of(node)
                    cite_texts = cites_of(node)
                    if ids["dois"] or ids["pmids"] or ids["ncts"] or has_comp or cite_texts:
                        units.append({"module": name, "protocol": str(label),
                                      "agents": agents_of(node), "cite_texts": cite_texts, **ids})
            for k, v in node.items():
                walk(v, k)
        elif isinstance(node, list):
            for v in node:
                walk(v, container)

    walk(data)
    # de-dup by (module, protocol)
    seen, out = set(), []
    for u in units:
        key = (u["module"], u["protocol"])
        if key not in seen:
            seen.add(key); out.append(u)
    return out

# ---------------------------------------------------------------- live resolvers
def _get(url, timeout=25, as_json=True):
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "AllyOS-protocol-verify/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read()) if as_json else (r.status, r.read())

def resolve_doi(doi):
    # Crossref first (works for journals); fall back to doi.org HEAD (catches preprints/medRxiv)
    try:
        d = _get("https://api.crossref.org/works/" + urllib.parse.quote(doi))
        msg = d.get("message", {})
        title = (msg.get("title") or [""])[0]
        return True, ("Crossref: " + title)[:160]
    except Exception:
        pass
    try:
        req = urllib.request.Request("https://doi.org/" + urllib.parse.quote(doi), method="HEAD",
                                     headers={"user-agent": "AllyOS-protocol-verify/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return (r.status < 400), "doi.org resolves (preprint/registered)"
    except Exception as e:
        return False, "unresolved: " + str(e)[:80]

def resolve_pmid(pmid):
    try:
        d = _get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=" + pmid)
        res = d.get("result", {})
        if pmid in res and not res[pmid].get("error"):
            return True, ("PubMed: " + res[pmid].get("title", ""))[:160]
        return False, "PMID not found"
    except Exception as e:
        return False, "lookup error: " + str(e)[:80]

def resolve_nct(nct):
    try:
        d = _get("https://clinicaltrials.gov/api/v2/studies/" + nct)
        t = (((d.get("protocolSection") or {}).get("identificationModule") or {}).get("briefTitle") or "")
        return bool(t), ("CT.gov: " + t)[:160]
    except Exception as e:
        return False, "lookup error: " + str(e)[:80]

def resolve_pmc(pmcid):
    try:
        d = _get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&retmode=json&id=" + pmcid)
        res = d.get("result", {})
        if pmcid in res and not res[pmcid].get("error"):
            return True, ("PMC: " + res[pmcid].get("title", ""))[:160]
        return False, "PMC not found"
    except Exception as e:
        return False, "lookup error: " + str(e)[:80]

def pubmed_citation(author, year, journal):
    term = author + "[Author] AND " + year + "[pdat]"
    if journal:
        term += " AND " + journal
    try:
        n, ids = _esearch(term)
        return (n > 0), ("PubMed match: " + str(n) + " hit(s)" + (" PMID " + ids[0] if ids else ""))
    except Exception as e:
        return False, "lookup error: " + str(e)[:80]

def _esearch(term):
    url = ("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=3&term="
           + urllib.parse.quote(term))
    r = _get(url).get("esearchresult", {})
    return int(r.get("count", "0")), r.get("idlist", [])

# Classify + resolve a free-text citation string. Articles -> PubMed; FDA/USP/guideline
# references aren't PubMed-indexed and are NOT treated as failures (just noted).
AUTHOR_YEAR = re.compile(r'^\s*([A-Z][A-Za-z\-]+)\b.*?\((\d{4})\)\s*(.*)')
NONPUBMED = re.compile(r'\b(FDA|USP|MASTER[- ]MENU|ESPEN|guideline|alert|Springfield|Standard|references|immediate[- ]use)\b', re.I)
FRONTIERS = re.compile(r'\b(fragi|fnagi|fimmu|fphar|fendo|fnut|fcell)\.(\d{4})\.(\d+)')

def resolve_citation(text):
    t = text.strip()
    m = DOI_RE.search(t)
    if m:
        ok, d = resolve_doi(m.group(0).rstrip(".,;")); return ("CONFIRMED" if ok else "FAILED"), "doi", d
    mf = FRONTIERS.search(t)
    if mf:
        ok, d = resolve_doi("10.3389/" + mf.group(0)); return ("CONFIRMED" if ok else "FAILED"), "doi", d
    mp = re.search(r'PMC(\d{5,9})', t)
    if mp:
        ok, d = resolve_pmc(mp.group(1)); return ("CONFIRMED" if ok else "FAILED"), "pmc", d
    ay = AUTHOR_YEAR.match(t)
    if ay:
        author, year, rest = ay.group(1), ay.group(2), ay.group(3)
        journal = re.split(r'[\d:;,]', rest)[0].strip()
        ok, d = pubmed_citation(author, year, journal); return ("CONFIRMED" if ok else "FAILED"), "article", d
    if NONPUBMED.search(t):
        return "REFERENCE", "non_pubmed", t[:90]   # FDA/USP/guideline — not auto-verifiable, not a defect
    return "UNPARSEABLE", "unknown", t[:90]

def pubmed_recent(term, days=60):
    today = datetime.date.today(); start = today - datetime.timedelta(days=days)
    url = ("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5"
           "&datetype=pdat&mindate=" + start.strftime("%Y/%m/%d") + "&maxdate=" + today.strftime("%Y/%m/%d") +
           "&term=" + urllib.parse.quote(term))
    r = _get(url).get("esearchresult", {})
    return int(r.get("count", "0")), r.get("idlist", [])

def trials_recent(term, days=90):
    start = (datetime.date.today() - datetime.timedelta(days=days)).strftime("%Y-%m-%d")
    url = ("https://clinicaltrials.gov/api/v2/studies?countTotal=true&pageSize=1&query.term=" +
           urllib.parse.quote(term) +
           "&filter.advanced=" + urllib.parse.quote("AREA[LastUpdatePostDate]RANGE[" + start + ",MAX]"))
    return int(_get(url).get("totalCount", 0))

def clean_agent(a):
    a = re.sub(r"\(.*?\)", "", a)              # drop parentheticals
    a = re.sub(r"[®™]", "", a)
    a = a.split("—")[0].split(" - ")[0].split("/")[0]
    return a.strip()

# ---------------------------------------------------------------- main
def main():
    report = {"date": datetime.datetime.utcnow().isoformat() + "Z", "agent": "protocol-verify",
              "scope": "published_only (in_primary_library:true, not pending/draft)", "protocols": []}
    cache_cite, cache_new = {}, {}
    confirmed = failed = checked = 0
    queue = []
    run_id = "pv-" + datetime.datetime.utcnow().strftime("%Y%m%dT%H%M")

    units = []
    for m in MODULES:
        p = os.path.join(ROOT, "protocols", m + ".json")
        if not os.path.exists(p):
            continue
        try:
            units += protocol_units(m, json.load(open(p, encoding="utf-8")))
        except Exception as e:
            print("parse error", m, e)

    references = unparseable = 0
    print("published protocol units:", len(units))
    for u in units:
        cites = []
        # structured ids (rare in published scope) + free-text citations (the published norm)
        targets = ([("id:" + t, t, "struct") for t in u["dois"] + u["pmids"] + u["ncts"]]
                   + [("cite:" + c, c, "text") for c in u.get("cite_texts", [])])
        for ck, val, kind in targets:
            if ck not in cache_cite:
                try:
                    if kind == "struct":
                        if val in u["dois"]: ok, detail = resolve_doi(val); ctype = "doi"
                        elif val in u["pmids"]: ok, detail = resolve_pmid(val); ctype = "pmid"
                        else: ok, detail = resolve_nct(val); ctype = "nct"
                        status = "CONFIRMED" if ok else "FAILED"
                    else:
                        status, ctype, detail = resolve_citation(val)
                except Exception as e:
                    status, ctype, detail = "FAILED", "error", str(e)[:80]
                cache_cite[ck] = (status, ctype, detail); time.sleep(0.34)
            status, ctype, detail = cache_cite[ck]
            checked += 1
            cites.append({"cite": val[:120], "type": ctype, "status": status, "detail": detail})
            if status == "CONFIRMED":
                confirmed += 1
            elif status == "REFERENCE":
                references += 1
            else:  # FAILED or UNPARSEABLE — both need a human (unparseable = unverifiABLE, not verified)
                if status == "UNPARSEABLE":
                    unparseable += 1
                else:
                    failed += 1
                queue.append({"review_item_id": run_id + "-" + str(len(queue) + 1), "run_id": run_id,
                              "module": u["module"], "protocol": u["protocol"],
                              "issue": "CITATION_UNRESOLVED" if status == "FAILED" else "CITATION_UNPARSEABLE",
                              "identifier": val[:120],
                              "detail": detail, "clinician_decision": "", "reviewer": "", "review_date": ""})

        # what's new for this protocol's agents (mapped to the protocol, not a global list)
        new = {"papers": 0, "trials": 0, "pmids": []}
        for a in sorted(set(clean_agent(x) for x in u["agents"] if x))[:4]:
            if not a or len(a) < 3:
                continue
            if a not in cache_new:
                try:
                    n, ids = pubmed_recent(a)
                except Exception:
                    n, ids = 0, []
                try:
                    t = trials_recent(a)
                except Exception:
                    t = 0
                cache_new[a] = (n, ids, t); time.sleep(0.34)
            n, ids, t = cache_new[a]
            new["papers"] += n; new["trials"] += t; new["pmids"] += ids[:3]
        report["protocols"].append({"module": u["module"], "protocol": u["protocol"],
                                    "agents": sorted(set(clean_agent(x) for x in u["agents"] if x)),
                                    "citations": cites, "whats_new": new})
        print(u["module"], u["protocol"], "->", len([c for c in cites if c["status"] == "CONFIRMED"]),
              "ok /", len([c for c in cites if c["status"] == "FAILED"]), "fail · new:",
              new["papers"], "papers", new["trials"], "trials")

    report["published_protocols"] = len(units)
    report["citations_checked"] = checked
    report["citations_confirmed"] = confirmed
    report["citations_failed"] = failed
    report["citations_reference_nonpubmed"] = references
    report["citations_unparseable"] = unparseable
    report["status"] = "FAIL" if (failed or unparseable) else "PASS"
    report["review_total"] = len(queue)
    write_status(report); write_queue(queue)
    print("protocol-verify:", report["status"], "·", len(units), "published ·",
          confirmed, "confirmed ·", failed, "failed ·", unparseable, "unparseable citations")
    return 1 if (failed or unparseable) else 0

def write_status(report):
    with open(os.path.join(ROOT, "allyos", "protocol-verify.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

def write_queue(rows):
    cols = ["review_item_id", "run_id", "module", "protocol", "issue", "identifier", "detail",
            "clinician_decision", "reviewer", "review_date"]
    with open(os.path.join(ROOT, "allyos", "protocol-verify-queue.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for r in rows:
            w.writerow(r)

if __name__ == "__main__":
    sys.exit(main())
