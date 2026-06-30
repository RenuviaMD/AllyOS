# Cockpit Debugging Agent Deployment Architecture v1

Date updated: 2026-06-29

```text
Clinic dashboard
   ↓ incident trigger
Central cockpit debugging service
   ↓ trace / classify / root cause
Patch proposal + validation case
   ↓
Repo / CI validation
   ↓
Clinician / Medical Director review
   ↓
Version publisher
   ↓
Approved update to clinics
```

## Permissions
Clinics can trigger incidents. They cannot edit active clinical logic. The debugging agent can propose patches. The Medical Director approves clinical changes. The version publisher releases approved versions only.
