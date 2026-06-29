# CDS Update Agent Runbook v1

Date updated: 2026-06-29

## Run-anytime command

Run the CDS Update Agent using `cds_update_agent_master_prompt_v1.md`. Use `cds_update_source_registry_v1.csv`. Target the current protocol manifests/source audits. Return change events, citation audit, proposed patches, clinician-review queue, validation additions, and a run manifest. Do not publish clinical logic automatically.

## Run modes
- `full_scan`: monthly or major review.
- `targeted_scan`: one peptide, ingredient, source, protocol, or family.
- `protocol_only`: compare local protocols against source audit.
- `source_only`: source reachability/date/hash/redirect check.
- `safety_signal_scan`: adverse-event/safety-signal scan.
- `citation_audit_only`: verify existing citations.

## Publish rule
Metadata can be updated after audit. Clinical logic, safety gates, evidence labels, dosing/rates, or standing-order text require clinician signoff.
