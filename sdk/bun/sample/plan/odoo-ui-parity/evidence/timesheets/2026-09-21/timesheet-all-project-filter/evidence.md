# `TIMESHEET-ALL-PROJECT-FILTER-001`

## Source comparison

Odoo's `hr_timesheet_line_search` declares the structured `project_id` search field, and `timesheet_action_all` opens the All Timesheets action. The authenticated desktop capture searches Project for `Research & Development`, applies the facet, and renders `1-80 / 159`; the mobile capture renders the responsive All Timesheets Kanban state.

## Core3 implementation

`services/timesheets/pages/all-timesheets.yaml` and `services/timesheets/api/all-timesheets.yaml` remain separate and join through `page.id: all-timesheets`. The page declares the Project filter backed by the manager-scoped `all_timesheet_projects` options datasource. The API projects durable `project_id` into the list/pivot data and applies the project predicate while preserving current-company and empty-fixture guards. Existing persisted `timesheet_entries.project_id` and the project relation migration provide durable storage; no duplicate migration was added.

Focused coverage is `test/timesheets_all_project_filter.integration.test.ts`: 3 tests / 20 expectations for source mapping, paired contracts, project options, project/company/empty guards, manager permission, and file-backed restart.

## Evidence and blockers

- Odoo desktop: `odoo-desktop.png`; authenticated Project filter applied to Research & Development, `1-80 / 159`, no browser errors.
- Odoo mobile: `odoo-mobile.png`; authenticated responsive Kanban, no browser errors.
- Odoo runtime results: `odoo-results.json`.
- Core3 desktop/mobile capture is blocked before authentication: the bounded startup probe printed Vite readiness but never exposed backend `3001/api/modules`; exact output is in `core3-readiness.txt`.
- Odoo Print/PDF/action surfaces remain unexposed blockers. This slice is not module sign-off.
