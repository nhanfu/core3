# appraisals parity progress

Module owner: appraisals module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active
Verification trigger: feature-complete
Candidate commit: 7e57913dc7cecc3f4ce075baff60dbea9b228a2b

## Current state

The current-wave candidate separates page contracts from API/action fragments,
adds persisted appraisal/cycle CRUD, workflow guards, and deterministic data
for every declared appraisal state. No complete Odoo parity claim is made:
the live hr_appraisal addon is uninstallable and exposes no menu, and
authenticated Core3 desktop/mobile browser evidence remains open.

Focused verification for cca3203a:

- bun test ./test/appraisals.integration.test.ts --timeout 20000 — 2 passed,
  35 assertions, 0 failed; includes persistence, workflow, stale-write, and
  declared permission cases.
- git diff --check — passed before commit.
- bun run audit — passed at 661 pages, 670 routes, 1162 datasources.

## Current-wave browser evidence (2026-09-20)

The desktop authenticated probe at 1440x900 rendered /appraisals with five rows
and reached /appraisals/appraisal-detail?id=appraisal-demo-001 by double-click.
The detail page exposed Edit, Start, and Cancel after the page binding fix. No
current screenshot was saved because the backend then became unavailable before
CRUD/workflow capture; mobile 390x844 was not run.

The exact runtime blocker was frontend 127.0.0.1:3002 serving the shell while
backend 127.0.0.1:3001/api/modules returned connection refused. The current
Odoo re-audit reached /odoo/discuss; hr_appraisal is uninstallable and the
Appraisal menu query returned zero rows. Paired Odoo parity remains unclaimed.

## Next bounded task

Retry the browser matrix on a stable isolated Core3 runtime, capture valid
desktop/mobile CRUD and workflow states under /tmp/core3-odoo-parity, and keep
paired Odoo parity open until hr_appraisal is installable.
