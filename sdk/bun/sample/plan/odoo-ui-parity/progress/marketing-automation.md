# marketing-automation parity progress

Module owner: marketing-automation module owner
QA assignment: marketing-automation-qa
Status: blocked-before-authenticated-browser-signoff (source-limited)
Verification trigger: feature-complete
Candidate commit: edb34a2b262a5fb46677c5f2a54fbce6434075f1

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

## Checkpoint evidence — 2026-09-20

- Runtime preflight used the isolated command recorded in the QA ledger. After
  moving the explicitly created stale `sample/coredb` directory to the desktop
  trash and recreating it, gateway `:4311`, service host `:4312`, and frontend
  `:4313` became reachable; `/api/modules` returned HTTP 200 and unauthenticated
  `/api/pages/automations` returned HTTP 401.
- No authenticated browser flow, restart-backed record assertion, or
  role-boundary browser assertion was completed in this checkpoint. No
  screenshot was written or committed. The next safe action is the authenticated
  Core3 desktop/mobile matrix, followed by a second launch without
  `--demo-data` to prove persistence.

## Final runtime attempt — 2026-09-20

- The clean all-service database root at
  `/tmp/core3-odoo-parity/marketing-automation-browser-20260920` failed before
  service-host readiness with DuckDB's `Cannot alter entry "email_mailings"
  because there are entries that depend on it.`
- A recovered runtime loaded the authenticated admin route
  `/marketing-automation/automations`; the seeded three-row list and selected
  `Renewal reminder journey` detail rendered. The `New automation` interaction
  timed out before a form state was available.
- No screenshot, create mutation, restart-backed persistence check, or
  dispatcher permission check was completed. Browser evidence remains blocked;
  the Odoo `marketing_automation` source gate remains unavailable and no paired
  parity claim is made.
