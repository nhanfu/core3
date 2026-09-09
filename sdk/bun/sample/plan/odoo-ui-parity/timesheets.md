# Timesheets UI parity

Status: ready

This is a plan-only implementation gate for Odoo 19 `hr_timesheet`. It must not
modify product code, migrations, fixtures, assets, or tests.

## Reference gate

- Odoo source: `/home/nhanjs/projects/odoo`, branch `19.0`, revision
  `65975996`.
- Addon manifest: `/home/nhanjs/projects/odoo/addons/hr_timesheet/__manifest__.py`.
  It is installable, named Task Logs, and depends on `hr`, `hr_hourly_cost`,
  `analytic`, `project`, and `uom`.
- Official demo data is declared in `data/hr_timesheet_demo.xml`; it adds
  timesheet permissions to `base.user_demo`, makes the two demo projects
  timesheetable, and creates dated analytic lines for project/task examples.
  The source uses `DateTime.now()` offsets, so Core3 must translate semantics
  to a fixed seed date rather than copy its non-determinism.
- Live authenticated reference: `http://localhost:8069`, database
  `core3_demo`, admin session, checked 2026-09-10. Authenticated
  `ir.module.module.search_read` reports
  `{name: hr_timesheet, state: uninstalled, demo: false, latest_version: false,
  installed_version: 19.0.1.0}`. Therefore no live Timesheets menu, action,
  record, or installed view is observable. Do not activate the addon in this
  plan-only task or claim that Odoo demo records are live.

## Live evidence and limitations

The authenticated browser fallback navigated to `/odoo/apps`, asserted the
Timesheets card text and its uninstalled/Activate state, and captured only that
state with headless Chrome at 1440x900 and 390x844:

- Desktop: `/tmp/odoo-timesheets-uninstalled-desktop.png`
- Mobile: `/tmp/odoo-timesheets-uninstalled-mobile.png`

These are not Timesheets UI references. No installed Timesheets desktop/mobile
screenshots, menu screenshots, record screenshots, or view screenshots exist;
none may be fabricated. Once `hr_timesheet` is installed in a disposable
database with demo loading explicitly known, recapture loaded authenticated
states and record the database, user/groups, source revision, viewport, route,
and failed-request list.

## Source menus, actions, routes, and views

Odoo `path` values below are web-client action aliases, not Python HTTP routes.
Actions without `path` are record-context actions and need explicit Core3
aliases or embedded-action coverage.

| Menu | Source XML ID and action | Source model/domain | Odoo path / view modes | Visibility |
| --- | --- | --- | --- | --- |
| Timesheets > My Timesheets | `timesheet_menu_activity_user` / `act_hr_timesheet_line` | `account.analytic.line`; project set and current `uid` | `/odoo/timesheets`; list, form, kanban, pivot, graph, calendar | `group_hr_timesheet_user` |
| Timesheets > Timesheets > My Timesheets | same action | current user's project lines; default week | `/odoo/timesheets`; same modes | `group_hr_timesheet_approver` |
| Timesheets > Timesheets > All Timesheets | `timesheet_menu_activity_all` / `timesheet_action_all` | `account.analytic.line`; project set | `/odoo/all-timesheets`; list, form, kanban, pivot, graph, calendar | `group_hr_timesheet_approver` |
| Timesheets > Reporting > By Employee | `menu_hr_activity_analysis` / `act_hr_timesheet_report` | `timesheets.analysis.report`; project not empty | `/odoo/timesheets-by-employee`; pivot, graph, list, form | approver |
| Timesheets > Reporting > By Project | `timesheet_menu_report_timesheet_by_project` / `timesheet_action_report_by_project` | analysis report; project grouping | `/odoo/timesheets-by-project`; pivot, graph, list, form | approver |
| Timesheets > Reporting > By Task | `timesheet_menu_report_timesheet_by_task` / `timesheet_action_report_by_task` | analysis report; project/task grouping | `/odoo/timesheets-by-task`; pivot, graph, list, form | approver |
| Timesheets > Configuration | `hr_timesheet_menu_configuration` / `hr_timesheet_config_settings_action` | `res.config.settings` | generated form action; planned `/timesheets/settings` | `base.group_system` |

Record/context actions are also part of the gate: `timesheet_action_task`
(task timesheets), `timesheet_action_project` (project timesheets),
`timesheet_action_from_employee` (employee-scoped lines),
`act_hr_timesheet_line_by_project` (`/odoo/project-timesheets`, list/kanban/
pivot/graph/form), and the project embedded Timesheets actions
`project_embedded_action_timesheets` and
`project_embedded_action_timesheets_dashboard`. They must be tested from the
owning task, project, employee, and project dashboard; they are not silently
promoted to unrelated top-level menus.

Source view contracts include editable-top list (`hr_timesheet_line_tree`),
approver list with employee (`timesheet_view_tree_user`), base and employee
search views, analytic form (`hr_timesheet_line_form` and user variant),
mobile kanban (`view_kanban_account_analytic_line`), calendar with multi-create,
my-timesheet and all-timesheet pivots, graphs grouped by week/project,
employee/project/task variants, and `timesheets.analysis.report` list/form/
pivot/graph views. The list uses date, project, task, description, employee
where permitted, and `unit_amount` as Time Spent with total and >24/negative
visual validation. The search contract includes My Timesheets, This Week,
Today, Last Week, and group-by Employee, Project, Task, Parent Task,
Department, and Manager. Analysis measures include Time Spent and Timesheet
Costs, with month/week date intervals as defined by the source view.

## State and interaction inventory

- Create/edit inline and form flows: date, project (required), task filtered by
  project/open/my tasks, description, employee for approvers, and Time Spent;
  default employee/project context must work from employee/project/task links.
- List, kanban, calendar, pivot, graph, and form switching; week default for
  My/All Timesheets; search, date filters, group-by, optional columns,
  totals, pagination, empty/help, loading, error, denied, and mobile card/
  overflow states.
- Time values must support hours and company-configured day encoding, display
  the configured UoM, reject/mark negative or over-24 values as Odoo does, and
  compute deterministic cost/amount from employee cost and analytic account.
- Project/task integration: only projects with `allow_timesheets` and an
  analytic account accept entries; project/task total spent and progress
  update after create/edit/delete; task/project embedded Timesheets tabs and
  drilldowns preserve scope.
- Configuration form: Time Encoding (UoM/method), user and approver reminder
  controls, and optional Time Off integration setting, including unavailable
  optional-module/upgrade state and system-only access.
- Attachments/chatter/activity/report links inherited from the source model and
  dependencies must be preserved where the shared Core3 contracts expose them;
  missing capability is a tracked gap, not a bespoke timesheet renderer.

## Existing Core3 surface and parity gap

`services/timesheets` currently has `manifest.yaml`, DuckDB storage,
`permissions.yaml` (`timesheets.read`, `.write`, `.manage`), two migrations,
pages for entries, entry detail, analysis, and a workflow, plus styles. It
provides `/timesheets` and `/timesheet-analysis`, a simplified denormalized
`timesheet_entries` table, Draft → Submitted → Approved/Rejected/Cancelled,
one demo row, a status filter, list, form, StatRow, and status chart.

It does not yet provide Odoo's user/all/context-scoped actions, calendar,
kanban, pivot, graph, analysis variants, inline editing, true employee/project/
task relations, analytic cost/UoM behavior, project/task integration,
settings, reminders, search/group-by/date defaults, attachments/chatter/
activities, report actions, or Odoo permission record rules. Existing
page-owned SQL must move to convention-discovered `services/timesheets/api/`
fragments keyed by `page.id`; API fragments must not be added to a frontend
`pages:` manifest. Preserve `/timesheet-analysis` as an alias while adding
explicit parity routes.

## Shared primitives

Reuse and verify `ListView` (Odoo variant, inline edit, optional columns,
search/filter/group/pager, responsive cards and totals), `OdooFormView`,
`Kanban`, `CalendarView`, `PivotView`, `GraphView`/`Chart`, `StatRow`,
`StatusChip`, date-range controls, async many2one selectors, action menus,
permissions, attachments/chatter/activity panels, `SettingsView`, and shared
loading/error/empty/access-denied/mobile content-scroll contracts. If calendar,
pivot, graph, editable timesheet-UoM, multi-create, or project/task scoped
selectors are missing, define and test their generic contract before any
Timesheets-specific implementation.

## Deterministic service-owned API/mock contract

All reads and mutations belong to `services/timesheets/api/*.yaml`; screens
remain layout-only. Use stable IDs, ordering, and explicit seed date
`2026-01-15`; never use `CURRENT_DATE`, random IDs, browser fixtures, remote
images, or live Odoo calls. Migrations must be idempotent for DuckDB and
supported adapters and prove fresh install and upgrade behavior.

Seed Odoo-derived semantic records such as Requirements analysis, Design,
Quality analysis, Delivery, Training, Presentation, On Site Visit, and Sprint,
with projects/tasks matching the official demo's two timesheetable projects.
Cover ordinary employee, approver, manager, accountant/system users; active
and non-timesheetable projects; open/closed tasks; employee/project/task
relations; departments/companies; hourly costs and hour/day UoM; billable and
non-billable lines; zero, fractional, over-24, and negative validation cases;
week/today/last-week dates; and empty list, report, and scoped results.

Required service operations include entry CRUD/bulk edit/delete, project/task/
employee scoped reads, UoM/cost calculation, project/task totals, report
grouping (employee/project/task), configuration save, reminders toggle, and
optional Time Off integration. Guards enforce active timesheetable project and
task, employee/company scope, required project/date/time fields, valid UoM and
amounts, row versions, and permissions. Return deterministic 401/403/404/409/
422 responses for denied, missing, conflict, and validation branches. Cross-
service project/employee/company data uses declared `yaml.service.<id>` calls,
not direct SQL against another isolated service database.

## Acceptance gate

- Source menu/action inventory is mapped to explicit Core3 routes or documented
  deliberate redirects, including every record/context and embedded action;
  ordinary-user, approver, manager, accountant, and system visibility matches
  Odoo, and technical-only/optional dependency states are deliberate.
- Authenticated browser checks start from the Core3 Timesheets menu and cover
  each enabled route/action at 1440x900 and 390x844; direct URL checks alone do
  not sign off navigation. Exercise search, My/All scope, date filters,
  group-by, optional columns, view switching, inline/form create/edit, row and
  project/task drilldown, report measures, settings save, and mobile no-
  horizontal-overflow behavior.
- Workflow/data checks prove stable fixture ordering, UoM/cost totals,
  project/task rollups, context defaults, valid and invalid validation, empty/
  loading/error/403/404/409/422 responses, and fresh-install/restart/upgrade
  idempotency through service-owned API/mock fragments.
- Visual checks compare loaded authenticated states only, assert title/menu/
  records/route and no unexpected failed requests, and save truthful captures
  under `/tmp/odoo-timesheets/` for each implemented desktop/mobile route and
  key empty/validation/settings state. The two existing uninstalled Apps
  captures remain limitation evidence, not parity evidence.
- Run the focused timesheets YAML/API/migration/browser checks, then
  `git diff --check`; implementation is not complete until all required checks
  pass and any uninstalled or unavailable Odoo/dependency behavior is recorded
  with exact observed status rather than inferred coverage.
