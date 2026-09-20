# appraisals parity progress

Module owner: appraisals module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active
Verification trigger: feature-complete
Candidate commit: cca3203a8cd0dea23e54941acc019b1f6bd57a3e

## Current state

The current-wave candidate separates page contracts from API/action fragments,
adds persisted appraisal/cycle CRUD, workflow guards, and deterministic data
for every declared appraisal state. No complete Odoo parity claim is made:
the live hr_appraisal addon is uninstallable and exposes no menu, and
authenticated Core3 desktop/mobile browser evidence remains open.

Focused verification for cca3203a:

- bun test ./test/appraisals.integration.test.ts --timeout 20000 — 2 passed,
  25 assertions, 0 failed.
- git diff --check — passed before commit.
- bun run audit — passed at 661 pages, 670 routes, 1162 datasources before a
  concurrent wave edit introduced the unrelated malformed
  services/sale_subscription/api/subscription-detail.yaml; the current
  repository-wide audit is therefore blocked outside this module.

## Next bounded task

Dispatch QA on the committed candidate, run the isolated authenticated Core3
desktop/mobile CRUD/workflow matrix, and repeat the paired Odoo inventory if
an installable hr_appraisal reference becomes available.
