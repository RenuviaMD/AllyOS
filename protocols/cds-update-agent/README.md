# CDS Update Agent — design v1

Run-on-demand clinical-content update / citation-audit / protocol-diff agent for the
licensed-provider CDS library (peptides, IV/IM, BHRT, supplements, safety gates,
standing orders). **Advisory-only, posture-locked:** no regulatory logic, no
auto-publish of clinical logic, clinician sign-off required for any clinical change.

## Files
- `cds_update_agent_master_prompt_v1.md` — the run-anytime agent prompt + core rules
- `cds_update_agent_runbook_v1.md` — run modes (full / targeted / protocol / source / safety-signal / citation-audit)
- `cds_update_agent_manifest_v1.jsonl` — the 11 subagents (UPD_001–011)
- `cds_update_source_registry_v1.csv` — 7 sources (DailyMed, PubMed, ClinicalTrials, openFDA/FAERS, internal protocols, NIH ODS, commercial) with use / do-not-use / directness
- `cds_update_decision_rules_v1.jsonl` — 8 publish/guardrail rules
- `cds_update_change_event_schema_v1.jsonl` · `cds_update_proposed_patch_schema_v1.jsonl` — output schemas
- `cds_update_validation_cases_v1.csv` — 10 regression cases
- `cds_update_clinician_review_queue_template_v1.csv` — the MD review queue
- `cds_update_agent_manifest_hash_v1.json` — package manifest

## Relationship to what's wired
`scripts/ops-audit.py` (run from the cockpit "Run now" + daily) is the MINIMAL drift
re-verification (one Opus pass per locked module). THIS package is the full design it
should grow into — the 11-subagent pipeline that monitors the 7 sources, diffs
protocols, audits citations, grades evidence, proposes patches, and builds the
clinician-review queue. Sources map to MCP tools already available (PubMed,
ClinicalTrials, openFDA/CMS, DailyMed). Nothing here publishes clinical logic.
