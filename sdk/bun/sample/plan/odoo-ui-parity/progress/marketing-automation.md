# marketing-automation parity progress

Module owner: marketing-automation module owner
QA assignment: marketing-automation-qa
Status: ready-for-test (source-limited)
Verification trigger: feature-complete
Candidate commit: 8c7e3db6e0e42b1c8aa3112b4d22742a924d1b5c

## Current state

The 2026-09-20 live inventory confirmed that the Odoo module registry marks
`marketing_automation` as `uninstallable`; no Marketing Automation menu,
window action, model, or view is installed in `core3_reference`. The Core3
service is therefore being advanced as an explicitly synthetic equivalent;
no paired Odoo parity claim is made.

Current-wave gap matrix and bounded slice are recorded in
`../marketing-automation.md`. The first slice is automation definition CRUD,
audience enrollment integrity, and existing workflow transitions with
page/API YAML separation.

## Next bounded task

Complete the API/page split and bounded CRUD/enrollment implementation, then
run focused contract/integration tests and authenticated Core3 desktop/mobile
QA where the runtime is available. Update this file only with evidence from
the matching module owner.

## Current-wave evidence — 2026-09-20

- `cd1302c2` adds the page/API split, maintenance schema/data migrations, and
  automation definition/enrollment actions.
- `8c7e3db6` binds archive/restore row values for list/detail action calls.
- Discovery binds `automations`, `automation-detail`, and
  `automation-analysis` to API fragments through matching `page.id` values.
- In-memory DuckDB checks pass for idempotent migrations, deterministic
  fixtures, create/update/duplicate/stale/archive behavior, enrollment name
  binding and duplicate-contact rejection, and the full
  publish/run/pause/run/complete workflow.
- Focused test file
  `services/marketing-automation/tests/marketing-automation.increment.test.ts`
  passes with 2 tests and 25 assertions via
  `bun test services/marketing-automation/tests/marketing-automation.increment.test.ts`.
- Authenticated paired Odoo/Core3 browser evidence is still pending; the Odoo
  reference has no installed Marketing Automation surface.
