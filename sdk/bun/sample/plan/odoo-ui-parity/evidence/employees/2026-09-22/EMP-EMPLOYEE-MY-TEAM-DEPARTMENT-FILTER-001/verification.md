# Verification

## Completed

- Source-backed page/API contracts and migration are committed only under the
  Employees service and Employees-owned QA/evidence paths.
- Focused DuckDB integration test passes: 3 tests / 19 assertions.
- The focused regression run for this slice plus New Contract and Newly Hired
  passes: 10 tests / 60 assertions.
- `bun run audit` passes with 797 pages, 806 routes, and 1,644 datasources;
  focused ESLint and `git diff --check` pass.
- The implementation preserves the existing `employees` page ID and does not
  add CRUD or mutation behavior.

## Browser blocker

The task-owned browser session `dzcy` attempted to borrow the authenticated
Odoo user tab `1770662590`. bsk returned:

`tab is borrowed by another session`

and identified the current borrower as session `ojpy`. The task did not stop or
take over that unrelated session. Therefore no authenticated Odoo or Core3
desktop/mobile screenshot is claimed for this feature. Required recapture:
Odoo Employees list with `My Team` and `My Department` selected at 1440x900 and
390x844, then the matching authenticated Core3 route at both viewports, with
request/page-error and horizontal-overflow checks.

The local Core3 runtime was also probed before finalization: authenticated
`/api/auth/me` was unavailable on both `127.0.0.1:3001` and
`127.0.0.1:3003` (`curl` exit 7, connection refused). The task-owned bsk
session `dzcy` was then stopped; bsk confirmed it was no longer registered,
leaving only the unrelated borrower session `ojpy`.

## Boundaries

The browser blocker is visual/authenticated-reference evidence only. Source,
contract, query, permission-scope, migration-replay, and restart checks are
complete. No aggregate Employees sign-off is claimed.
