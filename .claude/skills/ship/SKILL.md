---
name: ship
description: Verify and ship app-pimaster — run tests + typecheck + build, then commit and push everything to the designated claude/* branch. Use when a build increment is complete or the user says "ship", "commit", "push it", or "go" after approving work.
---

# Ship app-pimaster

1. `cd app-pimaster && npm run verify` — runs the unit tests, then the production build (which includes `tsc --noEmit`). If anything is red, fix it first; never commit failing code.
2. Stage everything (`git add -A` from the repo root — the stop hook rejects untracked files).
3. Commit with: one-line imperative summary + short body of what changed and why. No model names in the message. End with the session trailer used by this repo's existing commits.
4. `git push -u origin <designated claude/* branch>` (retry with backoff only on network errors).
5. Report back: test count, what shipped, commit hash. One short paragraph, no ceremony.
