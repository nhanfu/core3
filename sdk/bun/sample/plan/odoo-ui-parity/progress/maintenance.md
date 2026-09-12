# maintenance parity progress

Module owner: maintenance module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: 02bb85ec

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

## Next bounded task

Resolve `MAINT-QA-001`, then rerun the focused corpus and authenticated browser
edit/concurrency checks. After that, cover the remaining actor/company,
settings, activity/recurrence, full-route, and paired-Odoo gates before module
sign-off.
