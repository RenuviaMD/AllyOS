#!/usr/bin/env python3
"""
AllyOS Change Sentinel — DETERMINISTIC decision-change watch. NO LLM. NO hallucination.

It watches only the agents in our PUBLISHED protocols and surfaces ONLY a fact that would
change a deterministic decision, each with a link to the exact source record so the MD can
read the primary source and Approve / Reject. It NEVER edits a protocol.

Three signals, every one a verifiable fact (never an interpretation):
  1. RETRACTION   — a cited PMID has a PubMed 'Retracted Publication' record (NCBI esummary).
  2. TRIAL_STATUS — a cited NCT is TERMINATED / WITHDRAWN / SUSPENDED (ClinicalTrials.gov v2).
  3. FDA_LABEL    — a watched agent's label effective_time is NEWER than baseline (openFDA).

Fail-closed: a source that can't be reached is reported 'unverified', NEVER a fabricated change.
Categorized by line (IV / Peptides / HRT). Silence = the success state.

  python3 scripts/change-sentinel.py
Writes allyos/change-sentinel.json (+ queue) and allyos/change-sentinel-state.json (baselines).
Exit 0 always (a detected change is information, not a build failure).
"""
import json, os, re, sys, csv, time, urllib.request, urllib.parse, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PMID_RE = re.compile(r'PMID[:\s]*([0-9]{6,9})')
NCT_RE = re.compile(r'NCT\d{8}')
AUTHOR_YEAR = re.compile(r'^\s*([A-Z][A-Za-z\-]+)\b.*?\((\d{4})\)\s*(.*)')

LINE_OF = {"iv-module": "IV", "peptide-module": "Peptides", "peptide-stack-families": "Peptides",
           "peptide-iv-support": "Peptides", "bhrt-module": "HRT"}

def _get(url, timeout=25):
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "AllyOS-change-sentinel/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

# ---------------------------------------------------------------- published extraction (line-scoped)
def published_sources(module, data):
    """Return {pmids:set, ncts:set, cite_texts:set, agents:set} for published items only."""
    pmids, ncts, cites, agents = set(), set(), set(), set()

    def is_pending(n):
        if not isinstance(n, dict): return False
        if n.get("in_primary_library") is False: return True
        st = str(n.get("status", ""))
        return "DRAFT" in st.upper() or "market_addition" in st

    # Extract IDs from STRING LEAVES only, and never recurse into a pending/draft/market-addition
    # subtree — so pending content (e.g. the Niagen draft) can never leak into the published scope.
    def walk(node, container=""):
        if isinstance(node, str):
            for m in PMID_RE.findall(node): pmids.add(m)
            for m in NCT_RE.findall(node): ncts.add(m)
            return
        if isinstance(node, dict):
            if "market_addition" in container or is_pending(node):
                return  # PENDING / DRAFT — out of scope by design
            for k in ("citation", "citations", "source", "sources"):
                v = node.get(k)
                if isinstance(v, str): cites.add(v)
                elif isinstance(v, list): cites.update(x for x in v if isinstance(x, str))
            comps = node.get("components") or node.get("ingredients") or []
            if isinstance(comps, list):
                for c in comps:
                    if isinstance(c, dict) and (c.get("ingredient") or c.get("name")):
                        agents.add(c.get("ingredient") or c.get("name"))
            for k, v in node.items():
                walk(v, k)
        elif isinstance(node, list):
            for v in node:
                walk(v, container)

    walk(data)
    return {"pmids": pmids, "ncts": ncts, "cite_texts": cites, "agents": agents}

def pmid_from_citation(text):
    """Resolve a free-text 'Author (year) Journal' citation to a PMID (so it can be retraction-watched)."""
    m = re.search(r'PMID[:\s]*([0-9]{6,9})', text)
    if m: return m.group(1)
    ay = AUTHOR_YEAR.match(text)
    if not ay: return None
    author, year, rest = ay.group(1), ay.group(2), ay.group(3)
    journal = re.split(r'[\d:;,]', rest)[0].strip()
    term = author + "[Author] AND " + year + "[pdat]" + (" AND " + journal if journal else "")
    try:
        r = _get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term="
                 + urllib.parse.quote(term)).get("esearchresult", {})
        ids = r.get("idlist", [])
        return ids[0] if ids else None
    except Exception:
        return None

# ---------------------------------------------------------------- the three deterministic checks
def check_retraction(pmid):
    """Fact from NCBI esummary: is this PMID a 'Retracted Publication'? Returns (state, detail, url)."""
    try:
        d = _get("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=" + pmid)
        rec = (d.get("result", {}) or {}).get(pmid, {})
        if not rec or rec.get("error"): return ("unverified", "PMID not found this run", "")
        pubtypes = rec.get("pubtype", []) or []
        url = "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"
        if "Retracted Publication" in pubtypes:
            return ("CHANGE", "PubMed marks PMID " + pmid + " as a Retracted Publication: " + rec.get("title", "")[:120], url)
        return ("clear", "active (pubtype: " + ",".join(pubtypes[:3]) + ")", url)
    except Exception as e:
        return ("unverified", "lookup error: " + str(e)[:60], "")

TRIAL_BAD = {"TERMINATED", "WITHDRAWN", "SUSPENDED"}
def check_trial(nct):
    """Fact from ClinicalTrials.gov v2: overallStatus. Flags only TERMINATED/WITHDRAWN/SUSPENDED."""
    try:
        d = _get("https://clinicaltrials.gov/api/v2/studies/" + nct)
        sm = ((d.get("protocolSection") or {}).get("statusModule") or {})
        status = (sm.get("overallStatus") or "").upper()
        url = "https://clinicaltrials.gov/study/" + nct
        if not status: return ("unverified", "no status this run", url)
        if status in TRIAL_BAD:
            why = sm.get("whyStopped", "")
            return ("CHANGE", nct + " status is " + status + (" — " + why[:100] if why else ""), url)
        return ("clear", nct + " status: " + status, url)
    except Exception as e:
        return ("unverified", "lookup error: " + str(e)[:60], "")

def check_label(brand, baseline):
    """Fact from openFDA: label effective_time vs baseline. Flags only if NEWER than baseline."""
    try:
        d = _get('https://api.fda.gov/drug/label.json?search=openfda.brand_name:"' + urllib.parse.quote(brand) + '"&limit=1')
        res = (d.get("results") or [])
        if not res: return ("unverified", "no openFDA label for '" + brand + "' this run", "", baseline)
        rec = res[0]
        eff = str(rec.get("effective_time", "") or "")
        setid = ((rec.get("openfda") or {}).get("spl_set_id") or [""])
        setid = setid[0] if isinstance(setid, list) else setid
        url = "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=" + setid if setid else \
              "https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=" + urllib.parse.quote(brand)
        if not eff: return ("unverified", "label has no effective_time", url, baseline)
        if baseline and eff.isdigit() and baseline.isdigit() and int(eff) > int(baseline):
            return ("CHANGE", brand + " label effective_time advanced " + baseline + " -> " + eff + " (re-verify warnings/contraindications)", url, eff)
        return ("clear", brand + " label effective_time " + eff, url, eff if not baseline else baseline)
    except Exception as e:
        return ("unverified", "lookup error: " + str(e)[:60], "", baseline)

# ---------------------------------------------------------------- main
def load(path, default):
    try: return json.load(open(path, encoding="utf-8"))
    except Exception: return default

def main():
    cfg = load(os.path.join(ROOT, "protocols", "change-sentinel-watch.json"), {})
    state = load(os.path.join(ROOT, "allyos", "change-sentinel-state.json"), {})
    baselines = state.get("label_baselines", {})

    # gather published sources per line
    per_line = {"IV": {"pmids": set(), "ncts": set(), "cites": set()},
                "Peptides": {"pmids": set(), "ncts": set(), "cites": set()},
                "HRT": {"pmids": set(), "ncts": set(), "cites": set()}}
    for mod, line in LINE_OF.items():
        p = os.path.join(ROOT, "protocols", mod + ".json")
        if not os.path.exists(p): continue
        s = published_sources(mod, load(p, {}))
        per_line[line]["pmids"] |= s["pmids"]
        per_line[line]["ncts"] |= s["ncts"]
        per_line[line]["cites"] |= s["cite_texts"]

    report = {"date": datetime.datetime.utcnow().isoformat() + "Z", "agent": "change-sentinel",
              "mode": "deterministic — no LLM; facts + links only; fail-closed", "lines": {}}
    queue, run_id = [], "cs-" + datetime.datetime.utcnow().strftime("%Y%m%dT%H%M")
    total_changes = total_unverified = total_watched = 0
    pmid_cache = {}

    for line in ("IV", "Peptides", "HRT"):
        changes, unverified, watched = [], [], {"pmids": 0, "ncts": 0, "labels": 0}

        # resolve free-text citations -> PMIDs, union with explicit PMIDs
        pmids = set(per_line[line]["pmids"])
        for c in list(per_line[line]["cites"])[:40]:
            pid = pmid_from_citation(c)
            if pid: pmids.add(pid); time.sleep(0.34)

        # 1. retraction watch
        for pid in sorted(pmids):
            if pid not in pmid_cache:
                pmid_cache[pid] = check_retraction(pid); time.sleep(0.34)
            st, detail, url = pmid_cache[pid]
            watched["pmids"] += 1
            if st == "CHANGE":
                changes.append({"agent": "PMID " + pid, "type": "RETRACTION", "fact": detail, "source_url": url})
            elif st == "unverified":
                unverified.append("PMID " + pid + ": " + detail)

        # 2. trial-status watch
        for nct in sorted(per_line[line]["ncts"]):
            st, detail, url = check_trial(nct); time.sleep(0.34)
            watched["ncts"] += 1
            if st == "CHANGE":
                changes.append({"agent": nct, "type": "TRIAL_STATUS", "fact": detail, "source_url": url})
            elif st == "unverified":
                unverified.append(nct + ": " + detail)

        # 3. FDA label-change watch (only the curated agents for this line)
        for w in cfg.get("fda_label_watch", []):
            if w.get("line") != line: continue
            brand = w.get("brand")
            st, detail, url, neweff = check_label(brand, baselines.get(brand)); time.sleep(0.34)
            watched["labels"] += 1
            baselines[brand] = neweff or baselines.get(brand)
            if st == "CHANGE":
                changes.append({"agent": w.get("agent") + " (" + brand + ")", "type": "FDA_LABEL", "fact": detail, "source_url": url})
            elif st == "unverified":
                unverified.append(brand + ": " + detail)

        for ch in changes:
            total_changes += 1
            queue.append({"review_item_id": run_id + "-" + str(len(queue) + 1), "run_id": run_id, "line": line,
                          "agent": ch["agent"], "change_type": ch["type"], "fact": ch["fact"],
                          "source_url": ch["source_url"], "decision": "", "reviewer": "", "review_date": ""})
        report["lines"][line] = {"changes": changes, "unverified": unverified, "watched": watched}
        total_unverified += len(unverified)
        total_watched += watched["pmids"] + watched["ncts"] + watched["labels"]
        print(line, "->", len(changes), "change(s),", watched, ",", len(unverified), "unverified")

    # Fail-closed at the TOP level too: CLEAR must mean "every watched source was actually
    # checked and none changed." If sources couldn't be reached (or nothing was checked at
    # all — e.g. a network outage), that is UNVERIFIED, never CLEAR.
    if total_changes:
        report["status"] = "CHANGES"
    elif total_unverified or total_watched == 0:
        report["status"] = "UNVERIFIED"
    else:
        report["status"] = "CLEAR"
    report["changes_total"] = total_changes
    report["unverified_total"] = total_unverified
    report["watched_total"] = total_watched
    with open(os.path.join(ROOT, "allyos", "change-sentinel.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    state["label_baselines"] = baselines
    state["last_run"] = report["date"]
    with open(os.path.join(ROOT, "allyos", "change-sentinel-state.json"), "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
    cols = ["review_item_id", "run_id", "line", "agent", "change_type", "fact", "source_url", "decision", "reviewer", "review_date"]
    with open(os.path.join(ROOT, "allyos", "change-sentinel-queue.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for r in queue: w.writerow(r)
    print("change-sentinel:", report["status"], "·", total_changes, "decision-affecting change(s)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
