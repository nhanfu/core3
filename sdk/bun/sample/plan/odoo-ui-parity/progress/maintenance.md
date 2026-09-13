# maintenance parity progress

Module owner: maintenance module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: b09df475 (request-create validation)

## Current state

The current candidate adds a permissioned Maintenance Request detail edit
mutation. QA executed the Maintenance-focused corpus and an authenticated
request list/detail browser slice. No full parity claim is made here.

## QA wave result (2026-09-13)

- Focused corpus: **33 tests, 322 assertions, 0 failures** across 13 files
  (`bun test ./test/maintenance*.integration.test.ts --timeout 20000`).
- Authenticated Core3 browser: admin request list and request detail passed at
  1440x900 and 390x844 on isolated backend `:4335` / frontend `:3035`; zero
  console/page/request errors and no horizontal overflow. Evidence remains in
  `/tmp/core3-odoo-parity/maintenance-qa-desktop-retry.png` and
  `maintenance-qa-mobile-retry.png`.
- Permission boundaries: unauthenticated request list `401`; admin `200`;
  ordinary Fleet user request list/detail `403`; Fleet update `403`.
- QA finding `MAINT-QA-001`: changed stale request update returns the expected
  `409 STALE_RECORD`, but an identical stale no-op replay returns `200` because
  the generic update runtime checks for changed fields before concurrency. This
  candidate is conditionally failed and returned to development; QA made no
  product-code changes.

## Retest (2026-09-13)

- Fixed the shared `YamlMutationRuntime` unchanged-update path so it validates
  `expected_row_version` before returning. A stale identical payload now
  returns `409 STALE_RECORD` rather than `200`.
- Maintenance focused corpus after the fix: **33 tests, 323 assertions,
  0 failures**.

## 2026-09-13 bounded implementation batch: Maintenance Request create validation

The request-list create action now validates the values that the Odoo form
allows before inserting a record. It rejects case-insensitive duplicate names,
unsupported request types and priorities, and malformed scheduled dates with
stable 409/422 errors. A focused integration test proves a valid request is
persisted and invalid attempts do not create partial rows.

- Focused create test: **1 test, 8 assertions, 0 failures**.
- Full Maintenance corpus: **34 tests, 331 assertions, 0 failures** across 14
  files.
- Browser, actor/company, restart, and paired Odoo evidence remain outside this
  bounded implementation slice.

## Review integration

- Integrated commit: `b09df475`.
- Reviewer reran `maintenance_request_create.integration.test.ts`: 1 test, 8
  assertions, 0 failures, and the repository UI audit passed.
- Dedicated browser and full actor/company QA remain pending; this is not module
  sign-off.

## Next bounded task

## QA verification (2026-09-13, candidate `ab1ea2e5`)

- Focused Maintenance regression: **35 passed, 345 assertions, 0 failures**
  across 15 files. Activity schedule/complete persistence, detail binding,
  validation, archived-parent, permission metadata, and stale guards passed.
- Audit and `git diff --check` passed; changed Maintenance tests lint clean.
  Repository lint remains blocked by unrelated pre-existing errors at
  `test/website_public.integration.test.ts:31,33`.
- Full sample regression: **1113 passed, 1 failed**; only the unrelated
  Spreadsheet dashboard Share fixture failed.
- Authenticated Core3 desktop/mobile request-detail render passed at 1440x900
  and 390x844. Captures are outside Git at
  `/tmp/core3-odoo-parity/maintenance-candidate-desktop-final.png`,
  `maintenance-candidate-mobile-final.png`, and
  `maintenance-candidate-activity-modal.png`. Fleet browser access was denied
  and hid the schedule action; unauthenticated detail API returned 401.
- Odoo `:8069/odoo/maintenance` returned 303 to login, so no paired Odoo
  capture or visual parity claim is made. The browser form save stalled; the
  persistence claim is limited to the focused integration test.

QA result: conditional fail / evidence-only; no module sign-off.

Resolve `MAINT-QA-001`, then rerun the focused corpus and authenticated browser
edit/concurrency checks. After that, cover the remaining actor/company,
settings, activity/recurrence, full-route, and paired-Odoo gates before module
sign-off.

## QA verification (2026-09-13, candidate `f8e3219a`)

- Focused Maintenance regression: **35 tests, 345 assertions, 0 failures** across 15 files.
- jsdom/Vitest browser-shaped activity transport: **1 test passed**; schedule interpolates the detail request ID and Mark done sends the activity ID plus expected row version.
- Audit passed (**659 pages, 668 routes, 1140 datasources**); `git diff --check` and targeted ESLint passed.
- Full sample regression was started without a terminal result in the bounded window; it is not signed off.
- Authenticated desktop/mobile and Odoo evidence are blocked. Runtime retries did not provide a usable API/frontend pair: distributed startup had no backend listener, and the in-process gateway returned `503` from `/api/modules` with an unavailable service host. No captures or browser persistence/permission claims are made.

QA result: **conditional fail / evidence-only**; no module sign-off and no aggregate progress update.

## QA disposition `b6592b87` (2026-09-13)

Do not integrate the Maintenance equipment-edit candidate. QA found
`MAINT-UI-001`: authenticated admin is `Core3 Demo Company` while seeded
equipment rows use `My Company`, causing the edit company guard to reject valid
admin edits. Route fixture/company-context alignment to the existing owner
`agent/maintenance-request-create-wave` in
`/home/nhanjs/projects/core3-worktrees/maintenance-request-create-wave`, then
rerun focused and authenticated persistence checks. No replacement was
created; direct lifecycle reactivation is unavailable in this session. Restart
and paired Odoo gates remain open.

## Reconciled QA candidate: `377b8c05` (2026-09-13)

The activity-completion behavior is already represented on the active branch;
the candidate cherry-pick was empty after preserving newer shared schema/client
changes. Active Maintenance verification passed 36/355, audit, CSS, and
diff-check. QA's 37/372 and controlled-restart evidence is recorded. Module
remains conditional due Website lint, file-backed mutation durability, and Odoo
comparison blockers.

## QA hold: `ad654394` / `MAINT-ACTIVITY-001` (2026-09-13)

Activity QA is blocked at 36 pass / 1 fail because `request-detail.yaml` lacks
`activity_complete_action`. The candidate was tested detached and is absent
from the existing owner branch (`fc5accff`). Same owner must bring the valid
changes onto that branch, add the missing action, commit, and rerun full active
Maintenance QA. No product merge; lint, restart, and Odoo blockers remain.

## Reviewer hold: `fc5accff` (2026-09-13)

Owner QA passed, but active verification failed 1/37: the active equipment edit
mutation lacks the candidate-required invalid/stale/company guard set. The
provisional integration was reverted as `068a5db5`. Same owner must rebase the
complete guard contract plus company fixture repair against active APIs before
retest. Website lint, file-backed restart, and Odoo gates remain open.
