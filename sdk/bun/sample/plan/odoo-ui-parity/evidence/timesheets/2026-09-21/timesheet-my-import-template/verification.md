# `TIMESHEET-MY-IMPORT-TEMPLATE-001`

Source comparison is against `account.analytic.line.get_import_templates()` in
`addons/hr_timesheet/models/hr_timesheet.py:549-555`. Odoo returns the label
`Import Template for Timesheets` and the XLSX asset
`/hr_timesheet/static/xls/timesheets_import_template.xlsx` when the
`is_timesheet` context is active.

Core3 keeps the presentation and API contracts separate through
`page.id: timesheets`. My Timesheets owns the permissioned Download import
template control. The API records an actor/company-scoped, request-keyed
download in durable `timesheet_import_template_downloads` state, rejects an
inactive employee or foreign company, and rejects a stale replay. The client
action then downloads a deterministic CSV with the same import columns and a
sample row.

Verification:

- Focused: `bun test test/timesheets_import_template.integration.test.ts --timeout 20000` — 4 passed / 23 expectations.
- Full Timesheets regression: `bun test ./test/timesheets*.integration.test.ts --timeout 20000` — 212 passed / 1318 expectations.
- UI audit: `bun scripts/audit-order-ui.ts` — passed, 733 pages / 742 routes / 1434 datasources.
- Scoped lint: `bunx eslint test/timesheets_import_template.integration.test.ts` — passed.
- Browser probe: Core3 port 3001 returned no listener; Odoo ports 8069 and 8073 returned 303 to `/web/login`. Authenticated desktop/mobile screenshots were therefore unavailable and are not claimed.

Blockers remain explicit: the Odoo source exposes an XLSX asset while Core3
currently produces a deterministic CSV, and authenticated Core3/Odoo browser
evidence requires available runtimes. This bounded slice is not module sign-off.
