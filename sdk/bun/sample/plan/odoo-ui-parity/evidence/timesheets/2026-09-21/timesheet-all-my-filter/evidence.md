# `TIMESHEET-ALL-MY-FILTER-001`

## Source comparison

Odoo's `hr_timesheet_line_search` defines the `mine` filter labelled `My Timesheets` with the actor domain `user_id = uid`, and `timesheet_action_all` opens the All Timesheets action. The authenticated desktop capture opens the named filter menu, applies exactly one `My Timesheets` choice, and renders `1-42 / 42` for Mitchell Admin. The mobile capture renders the responsive All Timesheets Kanban state.

## Core3 implementation

`services/timesheets/pages/all-timesheets.yaml` and `services/timesheets/api/all-timesheets.yaml` remain separate and join through `page.id: all-timesheets`. The page declares the actor-scoped My Timesheets filter. The API applies the predicate against `current_user_name` while retaining manager permission, current-company, and empty-fixture guards. Existing persisted employee ownership in `timesheet_entries` provides durable state; no duplicate migration was added.

Focused coverage is `test/timesheets_all_my_filter.integration.test.ts`: 3 tests / 18 expectations for source mapping, paired contracts, actor/company/empty guards, manager permission, and file-backed restart.

## Evidence and blockers

- Odoo desktop: `odoo-desktop.png`; authenticated My Timesheets filter applied, `1-42 / 42`, no browser errors.
- Odoo mobile: `odoo-mobile.png`; authenticated responsive Kanban, no browser errors.
- Odoo runtime results: `odoo-results.json`.
- Core3 desktop/mobile capture is blocked before authentication: the bounded startup probe printed Vite readiness but never exposed `/api/modules` on 3001; exact output is in `core3-readiness.txt`.
- Repository audit is blocked before completion by an unrelated page-schema boundary; exact command/output is in `audit-blocker.txt`. No other-owner page was edited.
- Odoo Print/PDF/action surfaces remain unexposed blockers. This slice is not module sign-off.
