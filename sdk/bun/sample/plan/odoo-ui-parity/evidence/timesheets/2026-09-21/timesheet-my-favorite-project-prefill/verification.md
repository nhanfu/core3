# `TIMESHEET-MY-FAVORITE-PROJECT-PREFILL-001`

Odoo source comparison uses `_get_favorite_project_id()` and `default_get()`
in `addons/hr_timesheet/models/hr_timesheet.py`. Odoo searches the current
employee's recent five active, timesheetable projects, chooses the mode, and
assigns it to a new timesheet when the `is_timesheet` context is active.

Core3 keeps the page and API contracts separate through `page.id: timesheets`.
The My Timesheets page exposes a permissioned `New Timesheet` form action while
the API owns the `timesheet_entry_defaults` single-row datasource and binds it
to `create_timesheet_entry` with `prefill: source`. The datasource derives its
favorite from durable `timesheet_entries`, scopes by current employee and
company, accepts only active timesheetable projects, and returns an empty
prefill for empty, foreign-company, or unrelated-actor reads. Existing create
guards continue to enforce active employee/project/task relations and the
write permission.

Verification:

- Focused: `bun test test/timesheets_favorite_project_prefill.integration.test.ts --timeout 20000` — 3 passed / 17 expectations.
- Full Timesheets regression: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 215 passed / 1335 expectations across 57 files.
- UI audit: `bun scripts/audit-order-ui.ts` — passed, 735 pages / 744 routes / 1440 datasources.
- Scoped lint: `bunx eslint test/timesheets_favorite_project_prefill.integration.test.ts` — passed.
- Timesheets-owned `git diff --check` — passed.
- Browser probe: Core3 port 3001 was unavailable; Odoo ports 8069 and 8073 redirected to `/web/login`. Authenticated desktop/mobile screenshots were therefore unavailable and are not claimed.

Existing Odoo Print/PDF/report-action parity blockers remain open. This bounded
slice is not module sign-off.
