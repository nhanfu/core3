# SPREADSHEET-DASHBOARD-GROUP-DELETE-001

## Source contract

Odoo 19 revision `659759969d535d286b656c96b675e4612b925ddd` defines
`spreadsheet.dashboard.group` in
`addons/spreadsheet_dashboard/models/spreadsheet_dashboard_group.py`. Managers
have unlink access, while `_unlink_except_spreadsheet_data()` rejects deletion
when the record has a non-export external ID. The Core3 official fixture flag
is the deterministic equivalent of that source-owned external-data boundary.

## Core3 implementation

- `services/spreadsheet/api/dashboard-groups.yaml` adds
  `delete_spreadsheet_dashboard_group` with `spreadsheet.dashboard.manage`.
- The mutation requires the current `row_version`, rejects missing groups,
  official groups, non-empty groups, and stale rows with stable 404/409 codes.
- `services/spreadsheet/pages/dashboard-groups.yaml` exposes the action through
  the selectable Odoo-style list row menu.
- Migration `20260922100000-006-spreadsheet-dashboard-group-delete.yaml` adds
  the stable custom `sdg-delete-empty` fixture; `sdg-sales`/`sdg-custom`
  exercise protected and non-empty paths.

## Verification

Focused feature test: `bun test test/spreadsheet.integration.test.ts
--test-name-pattern 'implements Odoo official dashboard-group deletion
boundaries'` — 1 passed, 14 assertions. The Spreadsheet contract subset
(`--test-name-pattern` covering the existing dashboard, migration, share, and
new deletion assertions) passed 9 tests and 94 assertions.

The test reads the pinned Odoo model source, checks the page/API binding,
proves protected, non-empty, stale, successful, missing, and migration-replay
branches, and verifies the deleted group remains absent after replay.

## BrowserSkill result

On 2026-09-22, `bsk status --json` reported a connected Chrome extension. The
existing Odoo tab was `1770662590` at `http://localhost:8069/odoo/contacts/9`.
The single borrow request for session `kbux` remained pending on the required
borrow confirmation, so the session was stopped. No page was navigated or
observed, the `core3_reference` database route was not exercised, and no
authenticated visual evidence is claimed. No retry or alternate browser
backend was used.

The repository-wide Spreadsheet test was also not a clean gate in this shared
worktree: unrelated uncommitted Chat/Events/Live Chat files cause duplicate
`send_livechat_session_history` discovery errors, and the existing file-backed
share restart test cannot allocate under the full `/tmp` filesystem. The
Spreadsheet assertions that avoid those unrelated failures passed, along with
the UI audit and diff check.

## Scope remaining

Bulk deletion of multiple groups, dashboard reassignment, and full authenticated
Core3 desktop/mobile visual parity remain deferred. Official-group protection is
implemented for the existing deterministic `official` fixture mapping; a live
`ir.model.data` external-ID lookup is not claimed.
