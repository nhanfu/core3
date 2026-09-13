# spreadsheet parity progress

Module owner: spreadsheet module owner
QA assignment: spreadsheet QA
Status: active — bounded candidate QA complete; full module remains open
Verification trigger: feature-complete
Candidate commit: bbf5c539

## Current state

Candidate `bbf5c539` was verified in the isolated QA worktree on 2026-09-13.
The date-filter contract slice passes focused integration, migration
idempotence, per-user filtering, invalid/stale/permission guards, and the
existing share concurrency test. Targeted ESLint, Spreadsheet SCSS compile,
UI audit, and `git diff --check` pass. No product-code changes were made by
QA.

Authenticated desktop/mobile and paired Odoo captures were not available: the
interactive Playwright session was unavailable, and the clean candidate
runtime exposed `/api/modules` but returned 404 for the Spreadsheet page and
filter datasource registry. No visual or full-module parity claim is made.

## Next bounded task

Re-run the authenticated desktop/mobile candidate matrix after the runtime
registry is healthy, then cover reload/restart persistence, actor/company
boundaries, workbook runtime, and share/export workflows. Keep full module
sign-off open until the plan exit criteria are met.

## QA retest ledger — `0b023a13` (2026-09-13)

Retested in the isolated worktree at the exact repair commit. Authenticated Core3 in-memory HTTP evidence confirms `/api/pages/dashboards` is 200 and exposes all seven page-owned sources, including populated and empty results. `fixture_state=transport_error` produces source-scoped 503 contracts while the page envelope stays 200. Authenticated filter-source `POST /api/query` returns 200 with the admin row, 200 with `{data:{}}` for an unknown dashboard, and 503 with `SPREADSHEET_DASHBOARD_FILTER_UNAVAILABLE` for the transport fixture.

Focused regression passed: 12/12 tests, 120 assertions. Spreadsheet CSS, repository UI audit (659 pages, 668 routes, 1137 datasources), focused ESLint, and commit diff-check passed. Fresh authenticated Core3 desktop/mobile browser captures are outside Git at `/tmp/core3-odoo-parity/spreadsheet-registry-retest-{desktop,mobile}.png`; both had zero failed requests/page errors and no horizontal overflow. Odoo comparison captures were unavailable, so no paired parity claim is recorded.

QA finding: no regression found for this repair. This ledger does not change module status or constitute functional, permission, persistence, or Odoo parity sign-off.

## Coordinator reconciliation — Registry candidate `0b023a13` (2026-09-13)

- The runtime registry repair is already represented on active by `eca2ad0d`;
  the later owner dispatch HEAD `bdb2b6ce` was not substituted.
- The candidate's deletion of existing company-visibility coverage was not
  accepted. Active retained that regression and removed only its unused local
  in `75d69ebd`.
- Active verification passed **13 tests / 126 assertions**, audit **661 / 670 /
  1161**, targeted ESLint, and diff-check. Candidate evidence also confirms
  authenticated dashboard desktop/mobile registry, query, and error behavior.
- Spreadsheet remains active/conditional: Odoo comparison, broader workbook,
  export/share, actor, restart, and Temporal gates remain open.
