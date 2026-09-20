# `TIMESHEET-ALL-TASK-FILTER-001`

## Source comparison

Odoo's `hr_timesheet_line_search` declares the structured `task_id` search field, and `timesheet_action_all` opens the All Timesheets action. The authenticated desktop capture searches Task for `Create new components`, applies the facet, and renders `1-25 / 25` with the source total `38:00`; the mobile capture renders the responsive All Timesheets Kanban state.

## Core3 implementation

`services/timesheets/pages/all-timesheets.yaml` and `services/timesheets/api/all-timesheets.yaml` remain separate and join through `page.id: all-timesheets`. The page declares the Task filter backed by the manager-scoped `all_timesheet_filter_tasks` datasource. The API projects durable `task_id` into the list/pivot data, applies the task predicate, and scopes task options through active timesheetable projects in the current company. Existing persisted `timesheet_entries.task_id` and task relations provide durable storage; no duplicate migration was added.

Focused coverage is `test/timesheets_all_task_filter.integration.test.ts`: 3 tests / 21 expectations for source mapping, paired contracts, task options, task/company/empty guards, manager permission, and file-backed restart.

## Evidence and blockers

- Odoo desktop: `odoo-desktop.png`; authenticated Task filter applied to Create new components, `1-25 / 25`, no browser errors.
- Odoo mobile: `odoo-mobile.png`; authenticated responsive Kanban, no browser errors.
- Odoo runtime results: `odoo-results.json`.
- Core3 desktop/mobile capture is blocked before authentication by the shared page-discovery error `actions[1].title is not allowed`; exact output is in `core3-readiness.txt`. The failing page is outside Timesheets-owned paths.
- Odoo Print/PDF/action surfaces remain unexposed blockers. This slice is not module sign-off.
