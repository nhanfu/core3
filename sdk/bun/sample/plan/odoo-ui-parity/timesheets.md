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

## Current live reference recheck — 2026-09-12

The earlier `core3_demo` uninstalled state is historical limitation evidence.
A fresh authenticated recheck against Odoo database `core3_reference` rendered
`/odoo/timesheets`, `/odoo/all-timesheets`, and
`/odoo/timesheets-by-employee` for `codex@core3.local`; mobile navigation
selected Odoo kanban variants where applicable. Paired captures are recorded
in the QA ledger. This does not replace comparison of every enabled route and
interaction.

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
  captures remain historical limitation evidence, not parity evidence.
- Run the focused timesheets YAML/API/migration/browser checks, then
  `git diff --check`; implementation is not complete until all required checks
  pass and any uninstalled or unavailable Odoo/dependency behavior is recorded
  with exact observed status rather than inferred coverage.

## Batch 1 implementation record

Core3 Batch 1 implements the entries and reporting slice: service-owned API
fragments, deterministic `2026-01-15` demo data, My and All Timesheets routes,
shared List/Kanban/Form modes, and shared List/Pivot/Graph analysis. The
authenticated Core3 checks used admin@tms.local at 1440x900 and 390x844; the
truthful captures are `/tmp/odoo-timesheets/desktop-entries.png`,
`desktop-analysis.png`, `mobile-entries.png`, and `mobile-analysis.png`.

The Odoo reference remains a limitation, not parity evidence: authenticated
`hr_timesheet` inspection in `core3_demo` at source revision `65975996`
reported `state: uninstalled`, `demo: false`, and no installed Timesheets
menu, action, records, or views. No Odoo Timesheets screenshots were created
or used. The Core3 runtime also exposes the pre-existing `/api/v1/notifications`
404; it does not affect the Timesheets routes or datasource requests.

## Batch 2 implementation record — Configuration

Batch 2 adds the system-only Timesheets Configuration surface at
`/timesheets/settings`, with the Odoo `Timesheets` tab and exact `Time Encoding`,
`Timesheets Control`, and `Time Off` sections. Settings are persisted through
the page-bound `api/settings.yaml` fragment and a deterministic
`2026-01-15` migration row. `timesheets.settings` gates both the menu/page and
save action; invalid encodings or unavailable optional Time Off integration
return 422, stale row versions return 409, and missing permission returns 403.

Authenticated Core3 menu-to-route checks used `admin@tms.local` at 1440x900 and
390x844. Captures: `/tmp/odoo-timesheets/core3-settings-desktop.png` and
`/tmp/odoo-timesheets/core3-settings-mobile.png`. The live Odoo check used
`core3_reference` and `codex@core3.local`: the Timesheets Apps card displayed
`Upgrade`, so no installed Timesheets route or settings view was available.
Truthful limitation captures are `/tmp/odoo-timesheets-reference-desktop.png`
and `/tmp/odoo-timesheets/odoo-reference-apps-mobile.png`.

## Batch 3 implementation record — Reporting routes

Batch 3 adds the bounded reporting slice for the installed Odoo actions
`/odoo/timesheets-by-employee`, `/odoo/timesheets-by-project`, and
`/odoo/timesheets-by-task`. Each route has a layout-only page and a matching
Timesheets-owned API fragment joined by `page.id`, with approver permission,
pivot/graph/list modes, deterministic monthly pivot keys, Time Spent and
Timesheet Costs measures, search, and fixed `2026-01-15`-anchored demo data.
The data migration is idempotent and remains inside `services/timesheets`.

Focused report/settings integration tests pass: 6 tests and 60 assertions;
`git diff --check` is clean. The live Odoo reference was authenticated against
`core3_reference`; `hr_timesheet` is installed with demo data and the three
actions report `pivot,graph` modes. Post-fix Core3/Odoo desktop/mobile capture
signoff was limited by the interrupted isolated runtime/browser pass, so no
post-fix screenshot is claimed as final evidence here.

## Batch 4 implementation record — Billing type reporting

The refreshed authenticated owned reference is `core3_owned` on Odoo
`19.0-20260908`, checked as `codex@core3.local` after the module-install
restart. Exact observed module state was `hr_timesheet=installed,demo=true,
installed_version=19.0.1.0`, `sale_timesheet=installed,demo=true,
installed_version=19.0.1.0`, `fleet=installed,demo=true,installed_version=19.0.0.1`,
`mrp=installed,demo=true,installed_version=19.0.2.0`,
`mass_mailing=installed,demo=true,installed_version=19.0.2.7`, and
`im_livechat=installed,demo=true,installed_version=19.0.1.0`.

The next uncovered visible action was confirmed in the authenticated menu as
`Timesheets/Reporting/Timesheets/By Billing Type`, menu id `487`, action
`ir.actions.act_window,766`, named `Timesheets by Billing Type`, model
`timesheets.analysis.report`, path `timesheets-billing`, domain
`[('project_id', '!=', False)]`, and `pivot,graph` view modes. Odoo’s exact
empty help text was also observed: `No data yet!` and `Review your timesheets
by billing type and make sure your time is billable.`

Batch 4 adds a Timesheets-owned `timesheets-billing` page/API pair, a
deterministic `billing_type` migration `0.0.5`, fixed semantic categories for
the seeded entries, Time Spent/Timesheet Costs/Billable Time/Non-Billable Time
measures, search and empty-fixture guards, and the permission-bound
`timesheets.manage` report menu. The page remains layout-only and joins its
API by `page.id`; the report is reachable from the authenticated Core3 menu at
`/timesheets/timesheets-billing`.

Focused report coverage passed 4 tests and 67 assertions; migration versions
are unique from `0.0.1` through `0.0.5`; the UI audit passed with 351 pages,
356 routes, and 624 datasources; CSS was rebuilt successfully in the isolated
worktree. Authenticated Odoo captures are
`/tmp/odoo-timesheets/owned-billing-final-desktop.png` and
`/tmp/odoo-timesheets/owned-billing-final-mobile.png`. Authenticated Core3
captures are `/tmp/odoo-timesheets/core3-billing-final-desktop.png`,
`/tmp/odoo-timesheets/core3-billing-final-mobile.png`, plus the exercised
empty-search state `/tmp/odoo-timesheets/core3-billing-empty-desktop.png`.
Both Odoo viewports and both Core3 viewports reported no failed requests or
console errors and no document/body horizontal overflow. Core3 desktop was
opened through the Timesheets menu; the mobile capture used the authenticated
action path because the compact launcher hides the nested menu, after the
desktop menu-to-action path was verified.

## Batch 3/4 revalidation record — installed Odoo reference and reporting contracts

The owned Odoo reference was queried live on 2026-09-10 as
`codex@core3.local` in database `core3_owned`. The queried module state was
`hr=installed,demo=true,installed_version=19.0.1.1`,
`hr_timesheet=installed,demo=true,installed_version=19.0.1.0`,
`project=installed,demo=true,installed_version=19.0.1.4`,
`sale_timesheet=installed,demo=true,installed_version=19.0.1.0`, and
`uom=installed,demo=true,installed_version=19.0.1.0`. The live menu tree keeps
By Employee (menu 413/action 664), By Project (414/665), By Task (415/666),
and By Billing Type (487/action 766) under
`Timesheets/Reporting/Timesheets`. Actions 664–666 and 766 are named
Timesheets by Employee/Project/Task/Billing Type, use model
`timesheets.analysis.report`, domain `[('project_id', '!=', False)]`, and
`pivot,graph` modes with list fallback. Billing action 766 exposes the
additional measures `billable_time` and `non_billable_time`. The live pivot
fixtures contain 991:00 total across June–September 2026; this is reference
evidence only, not a replacement for Core3's required fixed seed.

Authenticated Odoo 19 captures were refreshed at 1440x900 and 390x844:

- Desktop: `/tmp/odoo-timesheets-by-employee-desktop-owned.png`,
  `/tmp/odoo-timesheets-by-project-desktop-owned.png`,
  `/tmp/odoo-timesheets-by-task-desktop-owned.png`, and
  `/tmp/odoo-timesheets-billing-desktop-owned.png`.
- Mobile: `/tmp/odoo-timesheets/employee-owned-390x844-revalidated.png`,
  `/tmp/odoo-timesheets/project-owned-390x844-revalidated.png`,
  `/tmp/odoo-timesheets/task-owned-390x844-revalidated.png`, and
  `/tmp/odoo-timesheets/billing-owned-390x844-revalidated.png`.

Authenticated Core3 captures were checked through the Timesheets action paths
at both viewports. Desktop captures are
`/tmp/odoo-timesheets/core3-employee-revalidated-1440x900.png`,
`/tmp/odoo-timesheets/core3-project-revalidated-1440x900.png`,
`/tmp/odoo-timesheets/core3-task-revalidated-1440x900.png`, and
`/tmp/odoo-timesheets/core3-billing-revalidated-1440x900.png`; mobile captures are
`/tmp/odoo-timesheets/core3-employee-revalidated-390x844.png`,
`/tmp/odoo-timesheets/core3-project-revalidated-390x844.png`,
`/tmp/odoo-timesheets/core3-task-revalidated-390x844.png`, and the previously verified
`/tmp/odoo-timesheets/core3-billing-final-mobile.png`. Pivot, Graph, and List controls were
exercised on the reporting routes, including search and the billing empty
fixture. The checks reported no Timesheets failed requests or console errors;
the document stayed within the viewport at 1440px and 390px, with the wide
pivot table retained in its Odoo-equivalent scroll region on mobile.

Revalidation found the existing layout-only/page.id design aligned with the
installed reference. It also closed the reporting API-state gap: all four
report datasources now explicitly return deterministic empty/not-found results
and route-specific transport `503` contracts, while retaining the
`timesheets.manage` permission guard. The focused report test now covers every
route, menu/page/API ownership, read-only controls and measures, deterministic
SQL and migration versions, search, empty/not-found, and transport states.

## Batch 5 implementation record — My Timesheets

Implementation commit: `5c9977e26a7465bbed847b412dc9da62c18ac70e` on branch
`agent/odoo-ui-timesheets-my-20260911`, isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-timesheets-my-20260911`.
This bounded slice owns the installed Odoo `Timesheets / My Timesheets` action
(`/odoo/timesheets`) and its Core3 counterpart `/timesheets`. The page/API
pair is joined by `page.id: timesheets`; the page provides Odoo-labelled List,
Calendar, Kanban, and Form views while `api/entries.yaml` owns the datasource
and mutations. Migration `0.0.6` adds the sales-order-item label and seven
fixed Admin User fixtures dated 2026-01-07 through 2026-01-14. The personal
query returns ten Admin User entries from the fixed 2026-01-15 dataset and
supports search plus Today, This Week, and Last Week filters.

The permission boundary is intentional: creating requires `timesheets.write`,
editing/deleting is limited to the current user's Draft or Rejected entries,
workflow actions retain their existing write/manage permissions, invalid
dates/projects or hours outside `(0,24]` return `422`, approved/non-owned
mutations return `403`, transport failure returns `503`, and empty fixtures
return an empty result suitable for the UI empty state. The focused suite
passed 11 tests and 154 assertions across `timesheets_my.integration.test.ts`,
`timesheets_reports.integration.test.ts`, and
`timesheets_settings.integration.test.ts`; `git diff --check` passed. CSS was
rebuilt with `bun run css:build:global` and `bun run css:build:timesheets`.

Authenticated Odoo 19 was checked as `codex@core3.local` against the installed
Timesheets action. Authenticated Core3 was checked as `admin@tms.local` against
the isolated runtime on `http://localhost:3014` (the shared reference runtime
remains on `http://localhost:3002`). The Odoo menu-to-action path was verified
before the final direct action capture; the final Core3 capture used the same
authenticated `/timesheets` action after dismissing the launcher. No browser
page errors or failed requests were observed. Desktop and mobile documents
reported no horizontal overflow: `scrollWidth === clientWidth` at both 1440px
and 390px.

| viewport | authenticated Odoo | authenticated Core3 | sha256 (Odoo / Core3) |
| --- | --- | --- | --- |
| 1440x900 | `/tmp/odoo-timesheets-my-final-desktop-1440x900-20260911.png` | `/tmp/core3-timesheets-my-final-desktop-1440x900-20260911.png` | `7d583a0f3ed56aba61eb3390f3bf204ab0cd079bd6a55a03df937a47bb5a5e05` / `06fb878c80e2c490a1a9e9920e81a74f2a096475f37f2f5a1712d60ca19b11b8` |
| 390x844 | `/tmp/odoo-timesheets-my-final-mobile-390x844-20260911.png` | `/tmp/core3-timesheets-my-final-mobile-390x844-20260911.png` | `0d1226b51af3bd1e70312bd5d73dc29cd67e07a6f08ff0f6afa17ae788ed3f86` / `da66c205dd2151da29b03682ad4ad9befc3fb20b26fe86184256db776f18efd2` |

All four files are PNGs with the exact dimensions named in the table and are
kept under `/tmp`; no image is tracked. The desktop comparison shows the same
Odoo action hierarchy, search/list controls, project/task/date/description/time
columns, and a readable entry detail surface; Core3 has a Fluent blue shell and
split detail panel versus Odoo's purple shell and full-width table. The mobile
comparison shows Odoo's compact Kanban cards versus Core3's compact Calendar
month grid; both remain within 390px without clipping. Residual mismatches are
the expected live-fixture/date difference (Odoo's current September 2026 rows
versus Core3's deterministic January 2026 rows), shell/icon styling, exact
relational autocomplete and `00:00` time-input behavior, and Odoo's richer
sales-order-item relationships. These are outside this bounded slice and are
recorded rather than masked.

## Batch 6 implementation record - All Timesheets

Implementation commit: `8f665448` on branch
`agent/odoo-ui-timesheets-all-20260911`, isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-timesheets-all-20260911`.
Fix commit: `32724f32` declares the datasource pivot field contract discovered
by the authenticated browser pass. No files were changed in the parent
checkout and no screenshots are tracked.

This slice completes the approver-facing Odoo `timesheet_action_all` action at
`/timesheets/all-timesheets`. The page remains layout-only and is joined to
`api/all-timesheets.yaml` by `page.id`. It now declares List, Kanban, Form,
Calendar, Activity, Pivot, and Graph modes where the shared ListView supports
them; Odoo-labelled Date/Employee/Project/Task/Entry/Description/Sales Order
Item/Time Spent columns; fixed Today/This Week/Last Week filters; Employee,
Project, Task, Status, and Date groupings; and deterministic activity and
pivot-ready fields. The seed contains 15 stable lines across Admin User,
Morgan Taylor, and Priya Shah, two projects, and the semantic task fixtures.

The new `/timesheets/all-timesheets/detail` page/API pair is separately
joined by `page.id` and requires `timesheets.manage`, so a personal
`timesheets.read` surface cannot widen its detail scope through a query
parameter. Approver detail editing accepts non-cancelled rows, requires a row
version, rejects invalid dates/projects/hours with `422`, rejects stale writes
with `409`, and rejects missing/cancelled rows with `403`; personal edit scope
remains limited to the current user's Draft/Rejected lines. Empty/not-found
fixtures and route-specific transport `503` states are declared for list and
detail sources. Approve/Reject remain approver-only workflow actions.

Focused command and result:

```
bun test test/timesheets*.integration.test.ts
14 pass, 0 fail, 193 expect() calls
```

The isolated audit passed with `474 pages, 481 routes, 825 datasources`;
ESLint, `bun run css:build:global`, `bun run css:build:timesheets`, and
`git diff --check` also passed. The standalone slice test is
`bun test test/timesheets_all.integration.test.ts` (`3 pass`, `39 expect()`
calls).

Authenticated Odoo 19 was checked in the personal database
`core3_personal` as `codex@core3.local` at `http://127.0.0.1:8069/odoo/all-timesheets`.
The observed action returned 527 cross-employee rows and exposed List,
Calendar, Kanban, Pivot, and Graph controls; Odoo source declares the
approver-only All Timesheets menu and employee-aware primary form. The
isolated Core3 runtime was checked as `admin@tms.local` at
`http://localhost:3003/timesheets/all-timesheets` with backend `3121`.
The desktop view matrix and Morgan Taylor detail route reported no failed
requests, no page errors, and `scrollWidth === clientWidth` at 1440px.

The required authenticated comparison captures are below. Every listed file
is a PNG with the exact dimensions named in its path; hashes are SHA-256.

| viewport/state | Odoo reference | Core3 isolated | SHA-256 (Odoo / Core3) |
| --- | --- | --- | --- |
| 1440x900 list | `/tmp/odoo-timesheets-all-list-desktop-1440x900-20260911.png` | `/tmp/core3-timesheets-all-list-desktop-1440x900-20260911.png` | `a0af1813c29aef47c8c728e54aaa76f5514a2e7fd8407d8d3f6ecaa68af5f878` / `837e2bc1db3ed6f0205dc7b1841f429d1eb88882f56b175d9fb4c02f30cde189` |
| 390x844 list | `/tmp/odoo-timesheets-all-list-mobile-390x844-20260911.png` | `/tmp/core3-timesheets-all-list-mobile-390x844-20260911.png` | `6b532699393f7665d97ad1ee1a03b95ec2784808fd027a0295edaea5a234e38b` / `f4d256f71be209c599460ecbb5ddc9e275526ca4a22a04d782d5fb0cd7a6b124` |

The supported desktop mode captures are also retained under `/tmp`:

- Odoo: `/tmp/odoo-timesheets-all-calendar-desktop-1440x900-20260911.png`,
  `/tmp/odoo-timesheets-all-kanban-desktop-1440x900-20260911.png`,
  `/tmp/odoo-timesheets-all-pivot-desktop-1440x900-20260911.png`, and
  `/tmp/odoo-timesheets-all-graph-desktop-1440x900-20260911.png`.
- Core3: `/tmp/core3-timesheets-all-kanban-desktop-1440x900-20260911.png`,
  `/tmp/core3-timesheets-all-calendar-desktop-1440x900-20260911.png`,
  `/tmp/core3-timesheets-all-activity-desktop-1440x900-20260911.png`,
  `/tmp/core3-timesheets-all-pivot-desktop-1440x900-20260911.png`, and
  `/tmp/core3-timesheets-all-graph-desktop-1440x900-20260911.png`.

The visual comparison is intentionally bounded: Odoo uses its purple shell,
live September fixtures, avatar-backed relational widgets, and compact mobile
Kanban; Core3 uses the existing Fluent shell, fixed January fixtures, shared
YAML ListView renderers, and a protected detail form. At 390px the Core3
compact layout hides the desktop mode switcher, so mobile evidence is the
authenticated list state; desktop exercises the complete mode family. Rich
Odoo relational autocomplete, chatter/attachments, calendar multi-create,
full activity scheduling, and exact Odoo shell/icon styling remain deferred.

## Project-scoped Timesheets bounded slice (2026-09-12)

Core3 adds the project-detail Timesheets action at
`/timesheets/project-timesheets`, with a separate page/API pair, `page.id`
binding, project-scoped deterministic rows, filters, empty/error states, and
`timesheets.read`/`timesheets.manage` guards for scoped CRUD. The focused test
passes 3 tests and 23 assertions.

The installed Odoo reference could not provide a valid `hr_timesheet` action in
this database, and no paired browser captures were completed in the isolated
runtime. The implementation is source- and contract-bounded; visual parity
remains unclaimed and the screenshot gate stays open. Images remain outside
Git.

## Employee-context Timesheets action (2026-09-12)

The next uncovered source action is Odoo 19 `timesheet_action_from_employee`
from `hr_timesheet/views/hr_timesheet_views.xml`, opened by the Timesheets stat
button in `hr_timesheet/views/hr_employee_views.xml`. It is a record-context
action named `Timesheets`, filters `project_id != False` and
`employee_id = active_id`, defaults `default_employee_id: active_id`, and
uses the employee search view plus the Timesheets form. Its source help begins
`Record a new activity` and explains tracking working hours by project.

Core3 implements the bounded `/employee-timesheets` page/API pair, joined by
`page.id`, and adds the employee-detail Timesheets stat button/action. It is
not a top-level menu, preserving Odoo's context placement. The API provides
employee-scoped list/form reads, deterministic 2026-01-15 date filters, empty
and 503 transport fixtures, write permission boundaries, CRUD, positive
<=24-hour validation, missing-employee 404, row-version conflict handling,
and cross-employee 403 protection. The focused integration test is
`test/timesheets_employee.integration.test.ts`.

Authenticated desktop 1440x900 and mobile 390x844 Odoo/Core3 captures were not
completed in this isolated runtime, so visual parity is not claimed and the
required captures remain pending under `/tmp/core3-odoo-parity/timesheets-batch4-20260912/`.

## Task-context Timesheets action (2026-09-12)

The next uncovered visible action is Odoo 19 `timesheet_action_task` from
`addons/hr_timesheet/views/hr_timesheet_views.xml` (source revision and
database are recorded in the reference gate above). It is a record-context
action named `Task's Timesheets`, model `account.analytic.line`, with domain
`[('task_id', 'in', active_ids)]`, context `{'is_timesheet': 1}`, and
`view_mode: list`, using `timesheet_view_tree_user`. It is reached from the
project task's Timesheets relation/stat context, not from the top-level
Timesheets menu. The task form source is
`addons/hr_timesheet/views/project_task_views.xml`; its embedded Timesheets
tab uses the same employee/date/entry/Time Spent ordering and a mobile Kanban,
but that embedded action is a separate deferred surface.

Core3 implements the bounded `/task-timesheets` page/API pair. The layout-only
page is joined to `services/timesheets/api/task-timesheets.yaml` by
`page.id: task-timesheets`, and the project task detail form exposes a
Timesheets stat button that passes `task_id` as the active record context. The
API filters every read by task, retains Odoo's list-only action mode, and owns
deterministic fixed-date fixtures plus Today/This Week/Last Week and
Employee/Status filters. Create, edit, and delete require `timesheets.write`;
all mutations require the task scope, draft/rejected state, row version, and
positive time up to 24 hours. Missing task data returns 404, invalid values
422, stale writes 409, cross-task/protected rows 403, and transport fixtures
503. The source remains off the Timesheets menu, preserving Odoo's context
placement.

Focused `timesheets_task.integration.test.ts` passes 3 tests and 21
assertions; the full Timesheets integration set passes 22 tests and 257
assertions. The UI audit passes with 615 pages, 624 routes, and 1059
datasources; `git diff --check` is clean. There is no Timesheets-specific CSS
change in this slice.

The required authenticated 1440x900 and 390x844 captures were attempted but
not completed. Core3 startup on the isolated port 3015 failed because Vite
hit `EMFILE: too many open files` watching
`sdk/bun/sample/vite.config.ts`. The interactive browser capability is also
unavailable in this session (`js_repl` is not exposed and the local
`playwright` package cannot be resolved). The active Odoo reference at
`http://127.0.0.1:8073/web/login` returned HTTP 200, but no authenticated Odoo
or Core3 screenshot was created under `/tmp/core3-odoo-parity`; visual parity
is therefore explicitly unclaimed and remains a follow-up gate.

## Task-form embedded Timesheets tab (2026-09-12)

The next bounded visible surface is the Odoo task form's embedded `Timesheets`
notebook tab from `hr_timesheet/views/project_task_views.xml`. It is distinct
from `timesheet_action_task`: the tab is shown in the task form for timesheet
users when the task's project allows timesheets, and uses the task's
`timesheet_ids` relation with Date, Employee, Entry, Description, and Time
Spent columns plus the mobile kanban contract.

Core3 now declares that tab as a `content_slot` and mounts an Odoo-style
`LineItemGrid` into it. The Project task API obtains
`project_task_timesheets` through the Timesheets-owned
`yaml.service.timesheets` operation `timesheets.entries.by_task`; no service
reads the other service's isolated database directly. Existing fixed
`2026-01-15` task fixtures are reused, and the service contract honors
`timesheets.read` plus deterministic `empty`/`not_found` fixture states. The
full task-context CRUD action remains available through the stat-button route;
inline mutation wiring for this cross-service embedded grid is deferred until
the shared x2many service-action contract supports it.

Focused coverage passes 24 Timesheets integration tests and 266 assertions;
the UI audit passes with 646 pages, 661 routes, and 1110 datasources; the
embedded test and `git diff --check` pass. No browser captures were created or
claimed in this slice.

## Batch 4 implementation and paired reference evidence — 2026-09-12

Timesheets now has context-specific global CRUD action names for personal,
employee, project, task, entry-detail, and all-timesheet-detail surfaces. This
prevents one API fragment from overwriting another named mutation at runtime.
Approval also assigns `project_id` and `hours` from the submitted row before
calling the Project-owned hours mutation.

Focused coverage passes 27 tests and 275 assertions. An isolated authenticated
route matrix passes 26/26 checks across 13 routes at desktop and mobile. A
fresh authenticated Admin CRUD smoke passes create -> edit -> delete, and the
approval smoke passes create -> submit -> approve. Fleet permission checks
return the expected 403 boundaries.

The current authenticated Odoo reference is `core3_reference`. Paired loaded
state captures for My Timesheets, All Timesheets, and By Employee completed
12/12 across Core3/Odoo and desktop/mobile with no page/request failures:
`/tmp/odoo-timesheets/*-20260912.png`. Remaining report routes, settings,
context actions, and interaction-level parity comparison remain open.

## Bounded report binding slice — 2026-09-20

The supplied Odoo source defines `hr_timesheet.timesheet_report` as a bound
`ir.actions.report` for `account.analytic.line` in
`addons/hr_timesheet/report/report_timesheet_templates.xml`. The current
Core3 Timesheet entry detail had no equivalent report action or durable report
execution record.

This slice adds a layout-only/API-owned `Print` action to
`/timesheets/detail`. The API records a deterministic `Timesheets` report run
in `timesheet_report_runs` before opening the browser print surface. Runs are
company- and employee-scoped, require the current entry row version, and
expose report history through a matching API datasource. Migration `0.0.9`
seeds one fixed `2026-01-15` run and is replay-safe; no moving-clock or random
fixture values are used.

Focused evidence: `test/timesheets_report.integration.test.ts`, 4 tests and
22 assertions passed. The slice proves page/API ownership, missing-entry,
cross-employee, stale-row, invalid-request, migration replay, and file-backed
restart persistence. It does not claim project/task report bindings or the
full Odoo PDF/QWeb renderer; those remain separate parity work.

## Calendar multi-create slice — `TIMESHEET-CALENDAR-MULTI-CREATE` (2026-09-20)

Odoo's `hr_timesheet` calendar action is the `/odoo/timesheets` My Timesheets
action. Its source view at `addons/hr_timesheet/views/hr_timesheet_views.xml`
lines 328-350 uses `date_start="date"` and explicitly binds
`multi_create_view="hr_timesheet.view_calendar_account_analytic_line_multi_create"`.
The source multi-create form at lines 352-368 requires a project, optionally
selects an open task, accepts Time Spent, and accepts an optional description.

Core3 previously had the Odoo list/calendar/kanban/form family but no
multi-create action. This slice keeps page/API YAML separate: `entries.yaml`
adds a permissioned `Log multiple days` header action, while
`api/entries.yaml` owns its `timesheets.entries.calendar_batch_create` server
form, project/task lookup sources, validation guards, and refresh bindings.
The form uses an inclusive first/last-day range to represent the calendar's
selected cells, then inserts one Draft analytic entry per day. Each request
also writes a durable `timesheet_entry_batches` audit record, with a fixed
demo fixture and replay-safe migration `0.0.10`.

The action enforces `timesheets.write`, an active employee/company boundary,
active timesheetable project and open task relation, a one-to-31-day range,
and 0 < hours <= 24. Batch IDs and entry IDs are deterministic per actor,
range, and replay count. Migration setup normalizes the pre-existing relation
fixtures to the same `Core3 Demo Company` used by persisted Timesheets entries.

Focused evidence is `test/timesheets_calendar_multi_create.integration.test.ts`
(4 tests, 21 assertions): source comparison, three-day CRUD creation,
file-backed restart persistence, migration replay, permission/relation/range/
hours guards, and no-partial-write checks. The full Timesheets suite passes
41 tests and 355 assertions; the UI audit and scoped lint also pass.

Authenticated browser evidence is committed under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-calendar-multi-create/`.
Core3 desktop/mobile captures open and submit the modal for 2026-01-22 through
2026-01-24 and show the resulting Draft entries; Odoo `core3_reference` on
`127.0.0.1:8069` is captured in desktop calendar and responsive mobile kanban
states. All captures reported zero page/request errors and no horizontal
overflow. The mobile Odoo route resolves to its responsive kanban state, which
is recorded as an observation rather than claimed as a calendar rendering.
This slice does not sign off the full Timesheets module; remaining report,
context, interaction, and integration gates remain open.

## Task report binding slice — `TIMESHEET-TASK-REPORT-BINDING` (2026-09-20)

The next source-backed context gap is Odoo's `timesheet_report_task` report
binding from `addons/hr_timesheet/report/report_timesheet_templates.xml`
lines 188-197. It is an `ir.actions.report` for `project.task`, restricted to
`hr_timesheet.group_hr_timesheet_user`, with `qweb-pdf` report name
`hr_timesheet.report_project_task_timesheet` and a `project.task` report
binding. The action is reached from the task context, not the global
Timesheets menu.

Core3 now keeps the task page and service API separate through
`page.id: task-timesheets`. The page declares a permissioned `Print` header
action. The API derives task/project context from the task and its scoped
entries, exposes durable report history, and records one deterministic report
run through `timesheets.task_entries.print_report` before invoking the browser
print surface. Migration `0.0.11` creates `timesheet_task_report_runs` and
replay-safe fixed demo data. Missing task/empty task, stale entry-count,
actor, company, and read-permission guards reject without a partial run;
file-backed restart coverage proves the history remains available.

Focused coverage is `test/timesheets_task_report.integration.test.ts` (4 tests,
20 assertions). The full Timesheets suite passes 45 tests and 375 assertions;
the UI audit, scoped ESLint, and `git diff --check` pass. Authenticated Core3
desktop and mobile captures show the task context, one persisted entry, the
Print action, and the POST report action with no page/request errors or
horizontal overflow. Authenticated Odoo reaches `/odoo/all-tasks/100` for
`S00038 - Solar Panel Installation` at both viewports, but its task Actions
menu exposes no `Print` item and the installed reference does not execute the
source report binding. This is recorded as an exact paired-reference blocker,
not as a parity claim. Core3's browser print surface is not claimed to be an
Odoo QWeb/PDF renderer. Project report binding and the full authenticated
route/action comparison remain open.

## Project report binding slice — `TIMESHEET-PROJECT-REPORT-BINDING` (2026-09-20)

The next smallest report/context gap is Odoo's `timesheet_report_project` from
`addons/hr_timesheet/report/report_timesheet_templates.xml` lines 199-213.
It binds the `hr_timesheet.report_timesheet_project` QWeb-PDF report to
`project.project` for the Timesheets user group. The owning project form exposes
the context action; it is not a global Timesheets menu entry.

Core3 extends the existing project-context `/timesheets/project-timesheets`
page/API pair without moving the action. The page adds a permissioned `Print`
header action. The API derives the project name, scoped entry count, and total
hours from the authenticated company, records deterministic report history in
`timesheet_project_report_runs`, and exposes that history through a matching
datasource. Migration `0.0.12` seeds eight entries and 33 hours for the fixed
Core3 project report fixture and is replay-safe. Missing/empty project,
stale-count, actor, company, and read-permission guards reject without a
partial run; file-backed restart coverage proves history durability.

Focused coverage is `test/timesheets_project_report.integration.test.ts` (4
tests, 21 assertions). Authenticated Core3 desktop and mobile evidence opens
the Project detail `Actions > Timesheets` path, loads eight project entries,
and receives HTTP 200 from `timesheets.project_entries.print_report` after the
project Print action, with zero page/request errors and no horizontal
overflow. Authenticated Odoo reaches `/odoo/project/5` at both viewports and
shows a project Actions menu containing `Timesheets`, `Duplicate`, `Archive`,
`Delete`, and `Convert to Template`, but no `Print`; this exact reference UI
blocker is recorded rather than claimed as report parity. Core3's browser print
surface remains distinct from Odoo's QWeb/PDF renderer. Full route/action
comparison and module sign-off remain open.

## All Timesheets report action slice — `TIMESHEET-ALL-ENTRY-REPORT-ACTION` (2026-09-20)

Odoo's `timesheet_action_all` in
`addons/hr_timesheet/views/hr_timesheet_views.xml:484-498` is the approver
`account.analytic.line` action at `/odoo/all-timesheets`. The source
`timesheet_report` action in
`addons/hr_timesheet/report/report_timesheet_templates.xml:173-182` is bound
to that analytic-line model, so the manager context requires a report action
separate from personal Timesheets reporting.

Core3 adds the manager-only `Print` action to
`services/timesheets/pages/all-timesheets-detail.yaml`; its client behavior
and server mutation live in `services/timesheets/api/all-timesheets-detail.yaml`.
The new `services/timesheets/pages/all-report-preview.yaml` and
`services/timesheets/api/all-report-preview.yaml` form a separate
`page.id: all-timesheet-report-preview` route/API contract. The server inserts
into the existing durable `timesheet_report_runs` table and the preview is
company-scoped, permissioned by `timesheets.manage`, and guarded for actor,
company, stale-row, missing-entry, and invalid-report requests. No migration
schema change is needed because the existing report-run table is the durable
source for this context; replay and file-backed restart are covered.

`test/timesheets_all_report.integration.test.ts` covers source binding,
page/API separation, create/read, migration replay, restart persistence, and
no-partial-write permission/concurrency guards (3 tests / 16 expectations).
Authenticated Core3 desktop/mobile evidence is under
`evidence/timesheets/2026-09-20/timesheet-all-report-action/`; both viewports
show HTTP 200 report creation and the rendered preview without horizontal
overflow. Authenticated Odoo desktop `/odoo/all-timesheets` and mobile
`/odoo/all-timesheets?view_type=kanban` show the source list/kanban but no
visible Print/report-preview action. That is recorded as an exact paired
reference blocker, not a parity pass. Full route/action comparison, actual
QWeb/PDF equivalence, and module sign-off remain open.

## Employee report preview slice — `TIMESHEET-EMPLOYEE-REPORT-PREVIEW` (2026-09-20)

Odoo's `timesheet_action_from_employee` in
`addons/hr_timesheet/views/hr_timesheet_views.xml:547-565` scopes the
analytic-line action to the active employee. The shared
`timesheet_report` binding in
`addons/hr_timesheet/report/report_timesheet_templates.xml:173-182` supplies
the source report contract. Core3 already had a durable guarded employee
report run, but the employee Print action stopped at `window.print()` without
an authenticated report document.

Core3 now adds the page/API-separated `/timesheets/employee-report-preview`
route. Its read-only YAML report document loads the latest
company/employee-scoped durable run and persisted employee lines, with Print
and Back actions. The existing employee report mutation remains the durable
write boundary and retains actor, company, stale, missing-employee, and
empty-employee guards; preview reads fail closed outside the active
employee/company and support deterministic empty fixtures.

Focused coverage is
`test/timesheets_employee_report_preview.integration.test.ts` (4 tests / 23
expectations), including source binding, page/API separation, migration replay,
file-backed restart, persisted lines, and scope guards. Authenticated Core3
desktop/mobile captures follow employee Print to the preview and render three
persisted lines without page/request failures or horizontal overflow.
Authenticated Odoo `/odoo/employees/3` has the known empty/new-entry-only
Timesheets state and no visible Print/report action at either viewport, so the
source report execution is recorded as an exact blocker rather than parity.
Full route/action comparison, QWeb/PDF equivalence, and module sign-off remain
open.

## Wave 45 — `TIMESHEET-TASK-ACTION-PORTAL-VIEWS-001`

The next uncovered branch is the non-internal/project-sharing path of Odoo
`project.task.action_view_subtask_timesheet`. Odoo removes unsupported
internal views and substitutes `hr_timesheet_line_portal_tree`,
`timesheet_view_form_portal_user`, and
`view_kanban_account_analytic_line_portal_user`. This is distinct from the
completed internal Form, Pivot, Calendar, Kanban, Graph, task/project context,
multi-scope, display-name, and earlier portal list slices.

Core3 adds the portal task list/API pair `portal-task-timesheets`, plus the
read-only detail pair `portal-task-timesheet-detail`, joined independently by
`page.id`. Migration
`20260921194000-028-timesheets-task-action-portal-views.yaml` adds durable
portal task grants with a replay-safe task/user/company/active index. The
queries enforce `project.portal`, actor, company, task/subtask, missing,
empty, and stale task-version guards; the detail form is read-only and
restart-safe.

Focused coverage is
`test/timesheets_task_action_portal_views.integration.test.ts`: 3 tests / 24
expectations. Related task/action/report coverage is 49 tests / 279
expectations. Scoped ESLint and the UI audit pass at 764 pages / 773 routes /
1,555 datasources; the exact-path staged `git diff --check` is recorded with
the commit evidence.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-portal-views-001/`.
Core3 port 3001 refused connections and Odoo 8069/8073 redirected to
`/web/login`, so authenticated desktop/mobile captures and visual sign-off are
blocked. Odoo Print/PDF/action-surface blockers remain open; no module
sign-off is claimed.

## Task report preview slice — `TIMESHEET-TASK-REPORT-PREVIEW` (2026-09-20)

Odoo's `timesheet_report_task` is a `qweb-pdf` report bound to `project.task`
in `addons/hr_timesheet/report/report_timesheet_templates.xml:188-197`.
Core3 already had the task-context report binding and durable guarded run
history, but the Print action stopped at `window.print()` without an
authenticated report document.

Core3 now adds the page/API-separated `/timesheets/task-report-preview` route.
Its read-only YAML report document loads the latest company/task-scoped durable
task run and persisted timesheet lines, with Print and Back actions. The
existing task report mutation remains the durable write boundary and retains
actor, company, stale, missing-task, and empty-task guards; preview reads fail
closed outside the active task/company and support deterministic empty fixtures.

Focused coverage is
`test/timesheets_task_report_preview.integration.test.ts` (4 tests / 23
expectations), including source binding, page/API separation, migration replay,
file-backed restart, persisted lines, and scope guards. Authenticated Core3
desktop/mobile captures follow task Print to the preview and render the task
summary plus persisted line without page/request failures or horizontal
overflow. Authenticated Odoo `/odoo/all-tasks/100` has no visible Timesheets
Print/report action at either viewport, so the source QWeb/PDF execution is
recorded as an exact blocker rather than parity. Full route/action comparison,
QWeb/PDF equivalence, and module sign-off remain open.

## Employee-context report action slice — `TIMESHEET-EMPLOYEE-REPORT-ACTION` (2026-09-20)

Odoo's `timesheet_action_from_employee` in
`addons/hr_timesheet/views/hr_timesheet_views.xml:547-565` opens the
`account.analytic.line` list filtered by the active employee. The employee
form invokes it through `hr.employee.action_timesheet_from_employee`, so this
is a record-context route/action rather than a global Timesheets menu.

Core3 keeps `/employee-timesheets` as a page/API pair and adds its Print
header action to `services/timesheets/pages/employee-timesheets.yaml`. The
matching API derives employee/company/count/total from persisted
`timesheet_entries`, records report history in the new
`timesheet_employee_report_runs` table, and exposes history through a
permissioned datasource. Migration `20260920170000-014-timesheets-employee-
report-runs.yaml` seeds fixed data at `2026-01-15 00:00:00` and is idempotent.
Employee/company, empty, actor, stale, missing, and no-partial-write guards
are covered by restart-aware tests.

`test/timesheets_employee_report.integration.test.ts` covers source binding,
page/API separation, create/read, migration replay, file-backed restart,
guards, and deterministic fixtures (4 tests / 23 expectations). Authenticated
Core3 evidence is under
`evidence/timesheets/2026-09-20/timesheet-employee-report-action/` for desktop
and mobile. The module runner produced HTTP 200 report actions with no page or
request errors and no horizontal overflow; the normal fresh-DuckDB dev command
hit the pre-existing Timesheets migration `ALTER TABLE ... ADD COLUMN ...`
constraint limitation.

Authenticated Odoo `/odoo/employees/3` shows Marc Demo's Timesheets stat as
zero. Desktop clicking it opens a new-entry action instead of a populated
employee report; mobile hides the stat and records two aborted `/mail/data`
requests. This exact reference-data/action mismatch is recorded as a blocker,
not a parity pass. Full route/action comparison, QWeb/PDF equivalence, and
module sign-off remain open.

## Task analytic-line report renderer slice — `TIMESHEET-TASK-TIMESHEETS-REPORT` (2026-09-20)

The remaining task-context report action is Odoo's
`timesheet_report_task_timesheets` from
`addons/hr_timesheet/report/report_timesheet_templates.xml` lines 215-222.
It targets `account.analytic.line`, uses the `hr_timesheet.report_timesheet_task`
template, and is the report renderer for selected task timesheet lines. The
template at lines 146-171 renders the Timesheets heading, task context, date,
employee, optional task, description, time spent, and total columns. It is
distinct from the already-covered `project.task` report binding.

Core3 keeps this source-backed action in the existing task-context
`task-timesheets` page/API pair. The page adds a permissioned `Print lines`
action; the API uses the task entry datasource as the deterministic line
renderer, posts `timesheets.task_entries.print_lines_report`, and persists the
rendered report metadata in `timesheet_task_lines_report_runs`. Migration
`0.0.13` seeds a fixed `Timesheets` run at `2026-01-15 00:00:00` and is
replay-safe. The server action enforces `timesheets.read`, task existence and
non-empty scope, expected line-count freshness, signed-in actor, and company
guards before inserting a report run; history remains queryable after a
file-backed restart.

Focused coverage is `test/timesheets_task_lines_report.integration.test.ts`
(4 tests, 20 expectations). In a clean verification checkout containing only
the Timesheets slice, the full Timesheets suite passes 53 tests / 416
expectations and the UI audit passes with 670 pages, 679 routes, and 1211
datasources. Scoped ESLint and `git diff --check` pass. The shared checkout's
repository-wide audit is independently blocked by unrelated Employees page
schema edits (`actions[0].result` / `result_field`), which remain unstaged.

Authenticated Core3 desktop and mobile evidence is committed under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-task-timesheets-report/`.
Both viewports render the task line list, expose `Print lines`, and return HTTP
200 from the report action with no Core3 page/request errors or horizontal
overflow. Authenticated Odoo reaches `/odoo/all-tasks/100` at both viewports,
but its task Actions menu has no Print action, so paired report execution is an
exact reference blocker. Odoo mobile also records three aborted non-report
asset/action requests; no report parity claim is made. Core3's browser print
surface remains distinct from Odoo's QWeb/PDF renderer, and full module
sign-off remains open.

## Report preview renderer slice — `TIMESHEET-REPORT-PREVIEW-RENDERER` (2026-09-20)

The remaining report gap after the entry, task, project, and task-line binding
slices was the renderer itself. Odoo's `hr_timesheet.report_timesheet`
template in `addons/hr_timesheet/report/report_timesheet_templates.xml` renders
the Timesheets heading, date, employee, project/task context, description, Time
Spent, and total for `account.analytic.line` rows. Core3 previously recorded a
run and called `window.print()` from entry detail, but had no authenticated
YAML-owned report document route.

Core3 now separates the layout-only `/timesheets/report-preview` page from
`api/report-preview.yaml` by `page.id`. The API reads the latest scoped durable
`timesheet_report_runs` record and its analytic entry, while the page renders a
read-only OdooFormView report document with Print and Back to entry actions.
The existing entry Print action now posts its values through the generic YAML
mutation envelope, persists the report run, and navigates to the preview. The
contract enforces `timesheets.read` plus employee/company visibility; the
underlying report mutation retains missing-entry, actor, company, stale-row,
and invalid-request guards. Report creation/read is covered by deterministic
CRUD-style tests and file-backed restart/replay persistence using migration
`0.0.9`.

Focused evidence is `test/timesheets_report_preview.integration.test.ts`
(4 tests, 20 expectations). Clean isolated Timesheets verification passes 57
tests / 436 expectations and the UI audit passes with 671 pages, 680 routes,
and 1212 datasources. Scoped ESLint and `git diff --check` pass.

Authenticated Core3 desktop/mobile evidence is committed under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-report-preview-renderer/`.
Both viewports submit the report action with HTTP 200 and render the persisted
report preview without horizontal overflow. Odoo `core3_reference` comparison
at `/odoo/timesheets` shows the source list/kanban rows but no visible Print or
report-preview action in either viewport, so the equivalent Odoo interaction
is an exact reference blocker. One unrelated shell prefetch abort for
`/api/v1/companies` is recorded in the evidence JSON; no Timesheets request
failed. QWeb/PDF output parity and full module sign-off remain open.

## By Employee report drilldown slice — `TIMESHEET-REPORT-EMPLOYEE-DRILLDOWN` (2026-09-20)

Odoo's `act_hr_timesheet_report` exposes the `timesheets.analysis.report`
form definition in `addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46`
alongside the By Employee action at lines 138-175. Core3's By Employee report
had persisted analysis rows and Pivot/Graph/List states but no row route to the
underlying Timesheet detail.

Core3 now keeps the By Employee page and API separate by `page.id`. The API
returns employee/project/task relation IDs, scopes rows to the active company,
and owns `view_employee_report_entry`, a manager-permissioned navigation action
to the existing persisted `/timesheets/detail` page with `view_scope: all`.
The page uses full-page detail navigation rather than a mobile side panel, so
the report-to-detail transition remains width-safe. Existing durable
`timesheet_entries` persistence is reloaded through a file-backed restart in the
focused test; no new report fixture or moving time is introduced.

Focused coverage is `test/timesheets_employee_report_drilldown.integration.test.ts`
(4 tests, 15 expectations): page/API separation, relation-backed row routing,
company/manager guards, fixed fixtures, and restart detail persistence.
Authenticated Core3 desktop/mobile evidence is committed under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-employee-report-drilldown/`;
both viewports switch to List, open `timesheet-demo-001`, load `/timesheets/detail`
with HTTP 200, and stay within their viewport without browser errors.

Authenticated Odoo `/odoo/timesheets-by-employee` renders the aggregate
Timesheets by Employee analysis at desktop and mobile, but the current route
does not expose a visible row-to-form detail action; the source form definition
is not reachable through the loaded interaction. This is an exact paired
reference blocker, not a parity pass. Desktop records one unrelated aborted
`/mail/data` request and mobile records three unrelated aborted asset/action
requests. Browser capture used a temporary runtime workaround while concurrent
Ecommerce page-schema repairs were still present in the shared checkout; the
current shared Timesheets suite and UI audit now pass, and the workaround is
outside the commit.

## Project dashboard embedded Timesheets scope slice — `TIMESHEET-PROJECT-DASHBOARD-SCOPE-GUARDS` (2026-09-20)

Odoo's `project_embedded_action_timesheets_dashboard` is declared in
`addons/hr_timesheet/views/hr_timesheet_views.xml:600-610`. It hangs the
Timesheets action from the project update dashboard, calls
`action_project_timesheets`, applies the `allow_timesheets = True` domain,
passes `from_embedded_action`, and requires the Timesheets user group. Core3
already had the Project-owned dashboard page/API pair and Timesheets service
operations, but the service reads filtered only by project ID.

The Timesheets service now joins the durable `timesheet_projects` relation for
both `timesheets.entries.by_project` and `timesheets.entries.project_summary`.
Dashboard rows and totals require an active project, an analytic account, the
Timesheets-enabled flag, and the fixed active company; closed, missing-account,
wrong-company, and missing projects fail closed without changing persisted
entries. The existing Project page remains layout-only and its API keeps the
two dashboard datasources bound to `yaml.service.timesheets`; no Project-owned
file was changed. The durable `timesheet_entries` source is updated and read
again after a file-backed restart in the focused test; no moving or generated
fixture values were introduced.

Focused coverage is `test/timesheets_project_dashboard_scope.integration.test.ts`
(4 tests, 26 expectations): Odoo source/action comparison, page/API separation,
durable summary restart, relation/company guards, no-partial-read behavior, and
deterministic query checks. The shared Timesheets suite passes 72 tests / 516
expectations; scoped ESLint, diff-check, and the UI audit pass with 679 pages,
688 routes, and 1250 datasources.

Authenticated Core3 evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-20/timesheet-project-dashboard-scope-guards/`.
Desktop renders the project dashboard Timesheets hours, entries, and seeded
rows with no browser/request errors. Mobile renders the Timesheets panel and
rows with no browser/request errors but the existing Project dashboard layout
overflows to 477px at a 390px viewport; this is an out-of-scope Project-owned
responsive blocker, not a Timesheets pass. Authenticated Odoo desktop/mobile
`/odoo/project/5` renders Home Construction with no browser/request errors and
no horizontal overflow, but exposes no visible Timesheets embedded action on
the loaded project dashboard/form. That is the exact paired Odoo blocker.

## Project report preview slice — `TIMESHEET-PROJECT-REPORT-PREVIEW` (2026-09-20)

Odoo's `timesheet_report_project` is a `qweb-pdf` report bound to
`project.project` in `addons/hr_timesheet/report/report_timesheet_templates.xml:205-213`.
Core3 already had the project-context report binding and durable guarded run
history, but the Print action stopped at `window.print()` without an
authenticated report document.

Core3 now adds the page/API-separated
`/timesheets/project-report-preview` route. Its read-only YAML report document
loads the latest company/project-scoped durable project run and the persisted
timesheet lines, with Print and Back actions. The existing project report
mutation remains the durable write boundary and retains actor, company, stale,
missing-project, and empty-project guards; preview reads fail closed outside
the active project/company and support deterministic empty fixtures.

Focused coverage is
`test/timesheets_project_report_preview.integration.test.ts` (4 tests / 22
expectations), including source binding, page/API separation, migration replay,
file-backed restart, persisted lines, and scope guards. Authenticated Core3
desktop/mobile captures follow the project Print action to the preview and
render eight lines without page/request failures or horizontal overflow.
Authenticated Odoo `/odoo/project/5` renders the project at both viewports but
has no visible Timesheets Print/report action, so the source QWeb/PDF execution
is recorded as an exact blocker rather than parity. Full route/action
comparison, QWeb/PDF equivalence, and module sign-off remain open.

## Task timesheet lines preview — `TIMESHEET-TASK-TIMESHEET-LINES-PREVIEW`

Odoo source `timesheet_report_task_timesheets` is a `qweb-pdf` report bound to
`account.analytic.line` in
`addons/hr_timesheet/report/report_timesheet_templates.xml:215-222`. Core3's
existing task-line binding now has a concrete rendered action: `Print lines`
posts the guarded durable report mutation and navigates to the new
page/API-separated `/timesheets/task-lines-report-preview` document.

The preview reuses `timesheet_task_lines_report_runs` and the durable
`timesheet_entries` source, reads only the latest active-company/task run, and
renders the report metadata plus persisted lines. Migration replay and a
file-backed restart preserve the run and line. Actor, company, stale, empty,
and missing-task mutation guards remain enforced; deterministic empty and
wrong-company/task preview reads fail closed.

Focused test `test/timesheets_task_lines_report_preview.integration.test.ts`
passes 4 tests / 23 expectations. Authenticated Core3 desktop/mobile evidence
is recorded at
`evidence/timesheets/2026-09-20/timesheet-task-timesheet-lines-preview/`.
Authenticated Odoo `/odoo/all-tasks/100` has no visible Print/report action at
either viewport, so QWeb/PDF pairing is an exact blocker. Missing Odoo
Print/PDF/action surfaces, remaining route/action comparison, and module
sign-off stay open.

## By Project report drilldown — `TIMESHEET-REPORT-PROJECT-DRILLDOWN`

Odoo's `timesheets_analysis_report_form` exposes project and task relation
context for the `timesheets.analysis.report` model in
`addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46`; the By Project
window action is `timesheet_action_report_by_project` at lines 178-214. Core3's
By Project report previously rendered aggregate rows without a concrete row
context action.

Core3 now keeps page/API separation and returns durable `project_id` and
`task_id` relation fields from the company-scoped report source. The
manager-only `view_project_report_entry` action is owned by the API and
referenced by the page's row-open and double-click bindings. It navigates to
the existing `/project-timesheets?project_id=...` durable context and renders
the persisted project timesheet line; migration replay and restart preserve the
context. Empty and wrong-company reads fail closed, and no moving/generated
fixture values are used.

Focused coverage is
`test/timesheets_project_report_drilldown.integration.test.ts` (4 tests / 16
expectations). Authenticated Core3 desktop/mobile evidence is recorded at
`evidence/timesheets/2026-09-20/timesheet-project-report-drilldown/`.
Authenticated Odoo `/odoo/timesheets-by-project` shows aggregate report data at
both viewports but no loaded row-to-project-timesheet action/form; that exact
paired interaction blocker remains open. This bounded slice does not claim
Timesheets module sign-off.

## 2026-09-21 `TIMESHEET-ALL-COMPANY-SCOPE`

Selected the next uncovered All Timesheets security behavior after the portal,
analysis, and report interaction slices. Odoo's global analytic-line rule in
`addons/analytic/security/analytic_security.xml` restricts analytic lines to
`company_ids`; the Timesheets approver rules in
`addons/hr_timesheet/security/hr_timesheet_security.xml` layer the Timesheets
project/domain boundary on top.

Core3's separate `pages/all-timesheets.yaml` and
`api/all-timesheets.yaml` contracts now bind the durable All Timesheets read to
the active company. The detail datasource and approver edit mutation use the
same company guard, while the existing row-version concurrency guard remains
the stale-write boundary. No migration was needed because the persisted
`timesheet_entries.company_name` projection already exists.

Focused coverage is
`test/timesheets_all_company_scope.integration.test.ts` plus the existing All
Timesheets suite: 7 tests / 65 expectations. It covers Odoo source/security
comparison, page/API separation, permission, foreign-company exclusion and
explicit company switching, file-backed restart persistence, foreign edit
denial, stale owned writes, and deterministic query values.

Authenticated Core3 and Odoo desktop/mobile captures are under
`evidence/timesheets/2026-09-21/timesheet-all-company-scope/`. Both routes
rendered without page errors; Odoo's only failed requests were aborted shared
`/mail/data` prefetches. Core3 mobile visibly clips the wide existing list at
390px despite document width metrics reporting 390px. A single browser company
was available, so visual company switching is not claimed; repository tests
prove the boundary. Existing Print/PDF/action and broader route comparison
blockers remain open.

## Wave 30 — `TIMESHEET-MY-CALENDAR-DISPLAY-NAME-001`

The next smallest uncovered source-backed behavior is Odoo's calendar-specific
`calendar_display_name`. `hr_timesheet` computes a project label with the
encoded duration (`8h`, `2h30`, or day encoding) and sets the calendar
`create_name_field` to that value. This is distinct from the completed calendar
multi-create and company UoM settings slices.

Core3 keeps `pages/entries.yaml` layout-only and `api/entries.yaml` data-only,
joined by `page.id: timesheets`. The durable `timesheet_entries` source now
projects `calendar_display_name` from persisted entry hours and the active
company's persisted encoding setting; the My Timesheets calendar card uses that
field as its title. Existing actor/company and deterministic empty guards remain
the read boundary, so no migration was needed.

Focused coverage is
`test/timesheets_calendar_display_name.integration.test.ts` — 4 tests / 17
expectations. Relevant regression coverage passes 11 tests / 73 expectations;
the full Timesheets run includes the new suite. UI audit passes 737 pages / 746
routes / 1450 datasources; scoped ESLint and Timesheets-owned diff-check pass.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-my-calendar-display-name-001/`.
Core3 was not listening on port 3001 and Odoo 8069/8073 redirected to
`/web/login`, so authenticated desktop/mobile captures and paired Odoo captures
are blocked; no sign-off is claimed. Existing Odoo Print/PDF/action blockers
remain open.

## 2026-09-21 `TIMESHEET-PORTAL-SORTING`

The next uncovered portal behavior after the date filters is Odoo's
`_get_searchbar_sortings` contract in
`addons/hr_timesheet/controllers/portal.py`: Newest/date, Employee, Project,
Task, and Description are authenticated `/my/timesheets` sort actions.

Core3 now keeps the portal page/API pair joined by `page.id: timesheets-portal`
and exposes the supported sort choices through the page filter contract. The
durable portal datasource applies deterministic CASE-based ordering for date,
employee, project, task, and description while retaining the existing
employee/company scope, `timesheets.read` permission, date filters, empty
state, and detail concurrency guard. No migration or new fixture table was
needed.

The source also offers Sales Order Item and Invoice sort keys, but the current
owned portal projection has no persisted invoice relation; those two source
sorts remain explicit blockers rather than being faked. Focused coverage is
the portal sorting, date-filter, and base portal suites: 12 tests / 88
expectations pass, including source/page/API comparison, deterministic ordering
combined with date filters, actor/company/empty guards, file-backed restart,
stale draft edit rejection, permission, and no-moving-value checks.

Authenticated Odoo desktop/mobile evidence is under
`evidence/timesheets/2026-09-21/timesheet-portal-sorting/`; both viewports
expose the source sort links and render
`/my/timesheets?sortby=project_id`. Core3 browser capture is blocked before
route startup by the shared unowned discovery boundary
(`SyntaxError: YAML Parse error: Unexpected token`; the preceding focused
scan identifies an Ecommerce `search.lots`/`search.or packages...` schema
shape). No Core3 screenshot or parity sign-off is claimed. Odoo's dense mobile
table clipping and aborted background asset requests are recorded as reference
blockers.

## 2026-09-21 `TIMESHEET-PORTAL-DATE-FILTERS`

The next smallest uncovered portal behavior is Odoo's authenticated date
filter family. `hr_timesheet/controllers/portal.py` defines `all`, last
year/quarter/month/week, today, and this week/month/quarter/year filters on
`/my/timesheets`; the same controller also preserves actor-scoped search and
group context. The prior Core3 portal slice only exposed Today, This Week, and
Last Week.

Core3 now adds the complete deterministic date choice set to the existing
page/API pair (`page.id: timesheets-portal`) and translates each choice to a
fixed 2025/2026 window against durable `timesheet_entries`. The existing
company and current-employee scope, `timesheets.read` permission, empty state,
read-only portal action, and detail mutation concurrency guard remain in
force. No migration or duplicate persistence table was introduced.

Focused coverage is
`test/timesheets_portal_filtering.integration.test.ts` plus the existing portal
suite: 8 tests / 61 expectations pass, including source comparison, every
date-window read, actor/company/empty guards, file-backed restart, stale draft
edit rejection, page/API separation, and moving-value checks.

Authenticated Odoo desktop/mobile evidence is under
`evidence/timesheets/2026-09-21/timesheet-portal-filtering/`; Odoo exposes the
full filter family and `/my/timesheets?filterby=last_month` renders the changed
window at both viewports. Core3 capture is blocked before route startup by an
unowned discovery error in Employees:
`components[2].title is not allowed`. No Core3 screenshot or parity claim is
fabricated. Odoo mobile's narrow table is visibly clipped, and its background
asset/action requests are recorded as blockers; this slice makes no module
sign-off claim.

## 2026-09-21 `TIMESHEET-MY-ANALYSIS-VIEWS`

The next uncovered personal-action gap was Odoo's analysis view family. The
`act_hr_timesheet_line` action in
`addons/hr_timesheet/views/hr_timesheet_views.xml:402-465` declares
`list,form,kanban,pivot,graph`; its personal pivot at `:74-84` groups `date`
by week and measures `unit_amount` and `amount`, while the graph at `:100-113`
uses weekly date categories, project series, and time/cost measures.

Core3 now exposes the same Pivot and Graph views on the existing durable
`/timesheets` page. The page contract remains separate from
`api/entries.yaml`, joined by `page.id: timesheets`; the API declares the
pivot-ready fields on the company and current-employee scoped
`timesheet_entries` datasource. Existing `timesheets.read` permission,
employee/company guards, durable migration/restart behavior, and the existing
stale-row CRUD guard remain in force. No new fixture values or moving query
values were introduced.

Focused coverage is
`test/timesheets_my_analysis_views.integration.test.ts` (4 tests / 27
expectations) plus the updated personal view contract test; the bounded pair
passes 7 tests / 59 expectations. Authenticated Core3 desktop/mobile and Odoo
desktop/mobile captures are in
`evidence/timesheets/2026-09-21/timesheet-my-analysis-views/`. Core3 desktop
renders both analysis views; Core3 mobile hides the desktop-only tabs and fits
the 390px viewport. Odoo desktop exposes and renders Pivot and Graph on
`/odoo/timesheets`; its mobile action remains the responsive Kanban route and
hides those desktop-only analysis tabs. This feature has no Odoo analysis-view
blocker, but the broader missing Print/PDF/action surfaces recorded above
remain open and this slice makes no module sign-off claim.

## Authenticated portal timesheet list — `TIMESHEET-PORTAL-MY-TIMESHEETS` (2026-09-21)

The smallest remaining source-backed route was Odoo's authenticated portal
timesheet list. `hr_timesheet/controllers/portal.py:69-170` defines
`/my/timesheets` with description, employee, project, task, date filters, and
groupings; `views/hr_timesheet_portal_templates.xml:26-112` renders Date,
Employee, Project, Task, Description, and Time Spent.

Core3 adds the page/API-separated `timesheets-portal` contract at
`/my/timesheets` (module URL `/timesheets/my/timesheets`) and a Portal menu
entry. `portal_timesheet_entries` reads durable `timesheet_entries`, scoped to
the active company and signed-in employee, with deterministic empty, search,
and date-filter behavior. The read-only `view_portal_timesheet_entry` action
is `timesheets.read`-guarded and opens the existing own-scope durable detail
route; no duplicate entry table or mutation workflow was introduced.

Focused coverage is `test/timesheets_portal.integration.test.ts`: 4 tests / 29
expectations, including source/controller/template comparison, page/API
separation, migration replay, file-backed restart, employee/company/empty
guards, stable row navigation, permissions, and moving-value rejection.

Authenticated Core3 desktop/mobile evidence is under
`evidence/timesheets/2026-09-21/timesheet-portal-my-timesheets/`; both
viewports render the durable row and navigate to its detail without page
errors or overflow. Authenticated Odoo desktop/mobile evidence reaches
`/my/timesheets` and renders the source portal list. Odoo's captured portal
state exposes no row-to-detail action, so paired row-action parity remains an
exact blocker; no module sign-off is claimed.

## Billing report drilldown — `TIMESHEET-REPORT-BILLING-DRILLDOWN` (2026-09-21)

The smallest remaining distinct report interaction was the source-backed
Timesheets by Billing Type action recorded in the authenticated Odoo menu
inventory. The shared `timesheets.analysis.report` form exposes employee,
project, task, date, description, and time context. Core3's existing
`/timesheets-billing` route had durable billing rows and Pivot/Graph/List
controls but no row-to-entry action.

Core3 now keeps the billing page and API separate by `page.id`. The API returns
employee/project/task relation IDs and company context from durable
`timesheet_entries`, filters to the active company, and owns the manager-only
`view_billing_report_entry` navigation action. The page binds row-open and
double-click to that action, which opens the existing guarded
`/timesheets/detail` route with `view_scope: all` and `report_scope: billing`.
Migration replay and a file-backed restart preserve the billing row and detail
context; empty fixtures and wrong-company reads fail closed, with no moving or
generated values.

Focused coverage is `test/timesheets_billing_report_drilldown.integration.test.ts`
(4 tests / 20 expectations). Authenticated Odoo desktop/mobile evidence is
under
`evidence/timesheets/2026-09-21/timesheet-billing-report-drilldown/`; the report
renders at both viewports but exposes no loaded row-to-entry action.

Core3 browser capture is blocked by the concurrent non-Timesheets discovery
boundary: `services/surveys/pages/surveys.yaml` fails with
`actions[4].fields is not allowed` (and the audit also identifies the same
stale action shape in `services/accounting/pages/invoices.yaml`). Those files
were not changed or staged. This slice makes no browser parity or module
sign-off claim.

## Timesheets analysis report drilldown — `TIMESHEET-ANALYSIS-DRILLDOWN` (2026-09-21)

The next smallest unfinished report interaction was Odoo's
`act_hr_timesheet_report` action and `timesheets_analysis_report_form` in
`addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46,138-175`.
The source form exposes employee, project, task, date, description, and time
spent for a persisted analysis row. Core3's existing `/timesheet-analysis`
route had the durable report rows but no row action and its query did not scope
rows to the active company.

Core3 now keeps the layout-only page and API separate by `page.id`. The API
returns durable employee/project/task/date relation context from
`timesheet_entries`, applies the fixed active-company guard and deterministic
empty fixture state, and owns the permissioned
`view_timesheet_analysis_entry` navigation action. The page binds row-open and
double-click to that API action, which opens the existing guarded
`/timesheets/detail` route with `view_scope: all` and `report_scope: analysis`.
The persisted source and detail context survive migration replay and a
file-backed restart; no new generated or moving fixture values are introduced.

Focused coverage is `test/timesheets_analysis_drilldown.integration.test.ts`
(4 tests / 20 expectations). Authenticated Core3 desktop/mobile evidence is
under
`evidence/timesheets/2026-09-21/timesheet-analysis-drilldown/`; both viewports
open the rendered row into the durable detail and have no page/request errors
or horizontal overflow.

Authenticated Odoo `/odoo/timesheets-by-employee` renders the aggregate report
at both viewports but exposes no loaded row-to-analysis-form action. The source
form contract is recorded, while paired browser execution is an exact blocker;
this slice makes no parity or module sign-off claim.

## By Task report drilldown — `TIMESHEET-REPORT-TASK-DRILLDOWN`

Odoo's `timesheets_analysis_report_form` exposes project and task relation
context for the `timesheets.analysis.report` model in
`addons/hr_timesheet/report/hr_timesheet_report_view.xml:23-46`; the By Task
window action is `timesheet_action_report_by_task` at lines 218-254. Core3's By
Task report previously rendered aggregate rows without a concrete row context
action.

Core3 now keeps page/API separation and returns durable `project_id` and
`task_id` relation fields from the company-scoped report source. The
manager-only `view_task_report_entry` action is owned by the API and referenced
by the page's row-open and double-click bindings. It navigates to the existing
`/task-timesheets?task_id=...` durable context and renders the persisted task
timesheet line; migration replay and restart preserve the context. Empty and
wrong-company reads fail closed, and no moving/generated fixture values are
used.

Focused coverage is
`test/timesheets_task_report_drilldown.integration.test.ts` (4 tests / 16
expectations). Authenticated Core3 desktop/mobile evidence is recorded at
`evidence/timesheets/2026-09-20/timesheet-task-report-drilldown/`.
Authenticated Odoo `/odoo/timesheets-by-task` shows aggregate report data at
both viewports but no loaded row-to-task-timesheet action/form; that exact
paired interaction blocker remains open. This bounded slice does not claim
Timesheets module sign-off.
## Fifth-wave task progress context — `TIMESHEET-TASK-PROGRESS-001` (2026-09-21)

The next uncovered source-backed behavior after the portal, analysis, company
scope, and report/drilldown slices was the task progress context in Odoo's
`hr_timesheet` extension. `addons/hr_timesheet/models/project_task.py` exposes
stored `effective_hours`, `remaining_hours`, `progress`, `overtime`, and
`total_hours_spent` fields computed from the task allocation and persisted
analytic lines. Core3's task Timesheets page previously exposed only the line
list and report actions.

Core3 adds the page/API-separated `task_timesheet_progress` datasource to the
existing `task-timesheets` contract. A Timesheets-owned migration persists the
task company, allocation, and row-version relation state; the API computes
non-cancelled durable entry totals, remaining hours, percentage progress, and
overtime with the active-company guard. The layout-only page binds those
fields to a `Task progress` StatRow without moving the existing list/report
actions. Empty, wrong-company, transport, allocation-change, and restart
states are covered by the focused suite.

Focused coverage is `test/timesheets_task_progress.integration.test.ts`:
4 tests / 27 expectations, with the existing task/report suites rerun for 19
tests / 107 expectations. Authenticated Core3 desktop/mobile and paired Odoo
desktop/mobile captures are in
`plan/odoo-ui-parity/evidence/timesheets/2026-09-21/timesheet-task-progress/`.
Core3 renders 40 allocated, 8 spent, 32 remaining, 20% progress, and 0
overtime. Odoo's authenticated task form renders allocated time and its
Timesheets tab renders 04:00 spent and 06:00 remaining; the reference uses a
different seeded task and its native time widget, so the comparison is
field-level rather than a fixture-identical screenshot claim. Existing Odoo
Print/PDF/action surfaces remain blockers elsewhere in the module; no
Timesheets sign-off is claimed.
## Sixth-wave UoM encoding slice — `TIMESHEET-UOM-ENCODING-001` (2026-09-21)

The next genuinely uncovered source behavior after the portal, analysis,
all-company, report, and task-progress slices was Odoo's company-specific
Timesheet encoding. `hr_timesheet` exposes `Hours / Minutes` versus
`Days / Half-Days` in `res.config.settings`, stores the selected UoM on the
company, and formats `unit_amount` through the `timesheet_uom` widget and the
calendar display helper.

Core3 keeps the existing layout-only `/timesheets` page joined to
`api/entries.yaml` by `page.id: timesheets`. The durable entry datasource now
joins the active company's persisted `timesheet_settings` row and renders
`time_spent_display` as `HH:MM` in hours mode or deterministic day values in
days mode, while retaining raw hours and exposing `time_encoding_method`. A
forward migration aligns the existing settings row to `Core3 Demo Company`
without rewriting the historical seed migration. The existing settings
permission and optimistic row-version mutation remain the source of truth for
changing the mode.

Focused coverage is `test/timesheets_uom_encoding.integration.test.ts`:
4 tests / 24 expectations, with settings and My Timesheets regression tests
included in the 10-test / 67-expectation focused run. It covers source
comparison, page/API separation, read/settings permissions, active-company
filtering, hours/day rendering, stale settings rejection, deterministic
migration replay, and file-backed restart persistence.

Authenticated Odoo desktop/mobile evidence is in
`plan/odoo-ui-parity/evidence/timesheets/2026-09-21/timesheet-uom-encoding/`.
Odoo renders `HH:MM` on desktop and compact `h` values on mobile. Core3
authenticated capture is blocked by unrelated shared Inventory discovery
errors (`view_inventory_route_rules` unknown action; invalid `title` and
`variant` on a ListView); no Inventory files were changed. Existing Odoo
Print/PDF/action blockers remain open and no module sign-off is claimed.

## Seventh-wave My Timesheets default week — `TIMESHEET-MY-WEEK-DEFAULT-001` (2026-09-21)

The next smallest uncovered internal action behavior is Odoo's default week
context, not the already-completed portal date-filter family. The source
`act_hr_timesheet_line` action at
`addons/hr_timesheet/views/hr_timesheet_views.xml` uses
`search_default_week`, `is_timesheet`, and `is_my_timesheets` when opening
`/odoo/timesheets`.

Core3's existing layout-only `pages/entries.yaml` now declares
`default_filters: { work_date: this_week }`; the separate
`api/entries.yaml` contract already owns the durable company/employee-scoped
query and fixed `2026-01-12` through `2026-01-18` week window, joined by
`page.id: timesheets`. No duplicate persistence or portal behavior was added.

Focused coverage is `test/timesheets_my_week_default.integration.test.ts`:
4 tests / 19 expectations. It covers the Odoo action comparison, page/API
separation, read/write permissions, actor/company guards, stale detail
concurrency, deterministic migration replay, and file-backed restart.

Authenticated Odoo desktop/mobile evidence is in
`plan/odoo-ui-parity/evidence/timesheets/2026-09-21/timesheet-my-week-default/`.
Authenticated Core3 desktop/mobile captures render `/timesheets` with
`Date: This Week` at 1440x900 and 390x844, with no page errors or horizontal
overflow. Only aborted background prefetches for unrelated All Timesheets
surfaces are recorded. Existing Timesheets Print/PDF/action blockers remain
open and no module sign-off is claimed.

## Eighth-wave My Timesheets inline editing — `TIMESHEET-MY-INLINE-EDIT-001` (2026-09-21)

The next genuinely uncovered source behavior is Odoo's desktop editable-top
My Timesheets list. `addons/hr_timesheet/views/hr_timesheet_views.xml:4-22`
declares `hr_timesheet_line_tree` with `editable="top"`, exposing inline
date, project, task, activity, and time fields.

Core3's layout-only `pages/entries.yaml` now binds inline create/update
controls, while `api/entries.yaml` owns the paired
`timesheets.entries.create_inline` and `timesheets.entries.update_inline`
mutations through `page.id: timesheets`. Both mutations persist to the
existing `timesheet_entries` relation, resolve active project/task links, and
enforce `timesheets.write`, actor/company employee scope, Draft/Rejected row
ownership, valid time, and optimistic row-version concurrency. The activity
name is retained as the durable entry description for the existing report and
detail surfaces.

Focused coverage is
`test/timesheets_my_inline_edit.integration.test.ts` (4 tests / 19
expectations), including source comparison, page/API separation, CRUD,
permission/company/relation/time guards, stale writes, migration replay, and
file-backed restart.

Authenticated Core3/Odoo desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-21/timesheet-my-inline-edit/`.
Core3 desktop clicks a real list row and visibly renders Save/Discard inline
controls; Core3 mobile renders Calendar, and Odoo mobile renders Kanban, so
mobile inline-edit parity is not claimed. Odoo Print/PDF/report-action gaps
remain broader blockers; this bounded feature is not module sign-off.

## Ninth-wave My Timesheets Parent Task grouping — `TIMESHEET-PARENT-TASK-GROUP-001` (2026-09-21)

The next uncovered source-backed search behavior is Odoo's `Parent Task`
group-by filter. `addons/hr_timesheet/models/hr_timesheet.py:66` stores
`parent_task_id` from the analytic line's task relation, and
`addons/hr_timesheet/views/hr_timesheet_views.xml:226-240` exposes that field
in the authenticated Timesheets search group-by menu alongside Project and
Task.

Core3 keeps `pages/entries.yaml` layout-only and `api/entries.yaml` bound by
`page.id: timesheets`. A durable forward migration adds deterministic
`parent_task_id`/`parent_task_name` context to `timesheet_entries`, backfills
the two seeded parent contexts, and adds the API pivot/search projection. The
My Timesheets ListView now exposes `Parent Task` in `group_by`; reads retain
the existing `timesheets.read` actor/company and empty-fixture guards. Detail
writes retain the existing write permission and required optimistic
row-version guard.

Focused coverage is
`test/timesheets_parent_task_group.integration.test.ts`: 4 tests / 24
expectations. It covers Odoo source comparison, page/API separation,
deterministic parent relation data, actor/company/empty guards, stale CRUD
concurrency, migration replay, and file-backed restart persistence.

Authenticated Odoo evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-21/timesheet-parent-task-group/`.
The desktop search panel visibly includes `Parent Task` under `Group By`; the
390px responsive Kanban hides the desktop search panel. Core3 capture is
blocked before authentication by a concurrent non-Timesheets page-schema
failure (`PageSchemaError: components[0].views[0].group_by is required for
kanban`); the blocker is preserved in the evidence directory and no other
module was changed. Odoo Print/PDF/action surfaces and full route/action
comparison remain open; this bounded slice does not claim Timesheets sign-off.

## Tenth-wave My Timesheets total footer — `TIMESHEET-MY-TOTAL-FOOTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's aggregate Time Spent
footer. `addons/hr_timesheet/views/hr_timesheet_views.xml:18` declares the
`unit_amount` field with `sum="Total"` and the `timesheet_uom` widget.

Core3 keeps `pages/entries.yaml` layout-only and adds a `Total` footer bound
through `page.id: timesheets` to the API-owned `timesheet_entries_summary`
datasource. The summary recomputes from durable `timesheet_entries` using the
same actor, company, search, state, and date filters as the list, and formats
the total through the persisted company Hours/Minutes versus Days setting.
The existing read permission and detail-write optimistic concurrency guard
remain in force; no separate mutable total state is introduced.

Focused coverage is
`test/timesheets_my_total_footer.integration.test.ts`: 4 tests / 23
expectations. It covers the Odoo source comparison, page/API separation,
filter-aware totals, actor/company/empty/transport guards, stale concurrency,
migration replay, and file-backed restart persistence.

Authenticated Odoo evidence is under
`plan/odoo-ui-parity/evidence/timesheets/2026-09-21/timesheet-my-total-footer/`.
Desktop visibly renders the source total `127:00`; the responsive mobile
Kanban renders cards but does not expose the list footer. Core3 capture is
blocked before authentication because the shared dev startup launched Vite
on 3002 but did not expose backend 3001 during the bounded readiness check;
the exact blocker is recorded in the evidence directory. Odoo Print/PDF/action
surfaces and full route/action comparison remain open; no Timesheets sign-off
is claimed.

## Eleventh-wave My Timesheets Department grouping — `TIMESHEET-MY-DEPARTMENT-GROUP-001` (2026-09-21)

The next uncovered source-backed search behavior is Odoo's authenticated Department group-by. `addons/hr_timesheet/models/hr_timesheet.py:74` stores `department_id` on analytic lines from the employee relation, and `addons/hr_timesheet/views/hr_timesheet_views.xml:226-240` exposes the Department field and `groupby_department` search filter.

Core3 keeps `pages/entries.yaml` layout-only and joins it to the API contract through `page.id: timesheets`. A deterministic migration adds department identity/name metadata to durable `timesheet_employees`, and the personal `timesheet_entries` source projects it into the list/pivot data. The read source remains `timesheets.read` and retains actor/company/empty guards; detail writes retain the existing write permission and required optimistic row-version concurrency guard.

Focused coverage is `test/timesheets_my_department_group.integration.test.ts`: 4 tests / 28 expectations. It covers Odoo source comparison, page/API separation, deterministic relation data, actor/company/empty guards, stale CRUD concurrency, migration replay, and file-backed restart persistence.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-my-department-group/`. Desktop opens the Group By menu, selects Department, and captures the grouped result; mobile captures the responsive Kanban where the desktop group-by control is unavailable. Core3 browser capture is blocked before authentication because the bounded startup never exposed backend `127.0.0.1:3001`; the exact readiness output is preserved in the evidence directory. Odoo Print/PDF/action surfaces remain open and this bounded slice is not module sign-off.
## Twelfth-wave My Timesheets Manager grouping — `TIMESHEET-MY-MANAGER-GROUP-001` (2026-09-21)

The next uncovered source-backed search behavior is Odoo's authenticated Manager group-by. `addons/hr_timesheet/models/hr_timesheet.py:75` defines stored `manager_id` from `employee_id.parent_id`, and `addons/hr_timesheet/views/hr_timesheet_views.xml:226-240` exposes the Manager field and `groupby_manager` filter.

Core3 keeps `pages/entries.yaml` layout-only and joins it to the API contract through `page.id: timesheets`. A deterministic migration adds manager identity/name metadata to durable `timesheet_employees`, and the personal `timesheet_entries` source projects it into the list/pivot data. The read source remains `timesheets.read` with actor/company/empty guards; detail writes retain the required optimistic row-version concurrency guard.

Focused coverage is `test/timesheets_my_manager_group.integration.test.ts`: 4 tests / 28 expectations, covering Odoo source comparison, page/API separation, deterministic manager relations, actor/company/empty guards, stale concurrency, migration replay, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-my-manager-group/`. Desktop applies Manager grouping and captures the grouped result; mobile captures responsive Kanban where the desktop group-by control is unavailable. Core3 browser capture is blocked by an unrelated `discoverPages` schema error on `actions[2].fields[*].max_length`; the exact output is preserved in the evidence directory. Odoo Print/PDF/action surfaces remain open and this bounded slice is not module sign-off.

## Wave 13 All Timesheets Employee grouping — `TIMESHEET-ALL-EMPLOYEE-GROUP-001` (2026-09-21)

The next uncovered source-backed behavior is the authenticated All Timesheets Employee group-by. Odoo's `timesheet_action_all` action targets the All Timesheets route, and `hr_timesheet_line_search` exposes `groupby_employee` with `context={'group_by': 'employee_id'}`.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` action/data-only, joined by `page.id: all-timesheets`. The API now projects the durable `employee_id` relation into list and pivot data; the page exposes the relation in the pivot and as an optional hidden list column. No migration was needed because the existing durable `timesheet_entries.employee_id` relation is covered through file-backed restart.

Focused coverage is `test/timesheets_all_employee_group.integration.test.ts`: 4 tests / 23 expectations. It covers source comparison, page/API separation, deterministic employee relation data, actor/company/empty guards, stale row-version protection, and restart persistence.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-employee-group/`. Desktop applies Employee grouping and renders 23 employee groups; mobile captures the responsive Kanban where the desktop search/group-by control is unavailable. Core3 desktop/mobile capture is blocked before authentication by the shared `discoverPages` error `actions[2].fields must be a non-empty array`, recorded in `core3-readiness.txt`. Odoo Print/PDF/action surfaces remain open; no module sign-off is claimed.

## Wave 14 All Timesheets calendar multi-create — `TIMESHEET-ALL-CALENDAR-MULTI-CREATE-001` (2026-09-21)

The next uncovered source-backed behavior is the All Timesheets calendar multi-create action. Odoo binds `timesheet_action_all` to `timesheet_action_view_all_calendar`, whose calendar uses `multi_create_view="hr_timesheet.view_calendar_account_analytic_line_multi_create"`.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` action/data-only, joined by `page.id: all-timesheets`. The manager-only action selects an active employee and writes the existing durable `timesheet_entry_batches` record plus one `timesheet_entries` row per selected day. The existing calendar migration is reused; no duplicate persistence model was added.

Focused coverage is `test/timesheets_all_calendar_multi_create.integration.test.ts`: 4 tests / 25 expectations. It covers source comparison, paired contracts, selected-employee/company/relation/range guards, no-partial-write behavior, deterministic migration replay, and file-backed restart persistence.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-calendar-multi-create/`. Desktop renders the authenticated All Timesheets calendar and mobile renders responsive Kanban, both without page errors; the desktop runtime did not expose a standard New/Create toolbar button, so the multi-create dialog is not claimed. Core3 desktop/mobile capture is blocked before authentication by the shared `discoverPages` error `components[1].title is not allowed`, recorded in `core3-readiness.txt`. Odoo Print/PDF/action surfaces remain open; no module sign-off is claimed.

## Wave 15 All Timesheets Employee filter — `TIMESHEET-ALL-EMPLOYEE-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is the structured Employee filter in Odoo's `hr_timesheet_line_search`, used by the `timesheet_action_all` All Timesheets action. This is a record filter, not the already-covered Employee group-by.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds the manager-scoped Employee filter backed by active employees in the current company; the API adds the durable `employee_id` predicate while preserving company and empty-fixture guards. Existing persisted `timesheet_entries.employee_id` supplies the relation, so no duplicate migration was added.

Focused coverage is `test/timesheets_all_employee_filter.integration.test.ts`: 3 tests / 18 expectations for source mapping, paired contracts, employee/company/empty guards, manager permission, and file-backed restart. The bounded regression across the new filter and existing All Timesheets slices passed 18 tests / 104 expectations.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-employee-filter/`: desktop applies Employee = Mitchell and renders `1-42 / 42`; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile capture is blocked before authentication because the bounded 18-second startup probe never exposed backend `3001/api/modules`; exact output is in `core3-readiness.txt`. Odoo Print/PDF/action surfaces remain open; no module sign-off is claimed.

## Wave 16 All Timesheets Project filter — `TIMESHEET-ALL-PROJECT-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is the structured Project filter in Odoo's `hr_timesheet_line_search`, used by the `timesheet_action_all` All Timesheets action. This is a record filter, distinct from the existing Project group-by metadata and the completed Employee filter.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds the manager-scoped Project filter backed by active timesheetable projects in the current company. The API projects durable `project_id` into the list/pivot projection and applies the predicate while preserving company and empty-fixture guards. Existing persisted `timesheet_entries.project_id` supplies the relation, so no duplicate migration was added.

Focused coverage is `test/timesheets_all_project_filter.integration.test.ts`: 3 tests / 20 expectations for source mapping, paired contracts, project options, project/company/empty guards, manager permission, and file-backed restart. The existing All Timesheets focused regression is rerun with this slice.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-project-filter/`: desktop applies Project = Research & Development and renders `1-80 / 159`; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile capture is blocked before authentication because the bounded startup probe never exposed backend `3001/api/modules`; exact output is in `core3-readiness.txt`. Odoo Print/PDF/action surfaces remain open; no module sign-off is claimed.

## Wave 17 All Timesheets Task filter — `TIMESHEET-ALL-TASK-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is the structured Task filter in Odoo's `hr_timesheet_line_search`, used by the `timesheet_action_all` All Timesheets action. This is a record filter, distinct from parent-task grouping and task-progress context.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds the manager-scoped Task filter backed by open tasks on active timesheetable projects in the current company. The API projects durable `task_id` into the list/pivot projection and applies the predicate while preserving company and empty-fixture guards. Existing persisted `timesheet_entries.task_id` supplies the relation, so no duplicate migration was added.

Focused coverage is `test/timesheets_all_task_filter.integration.test.ts`: 3 tests / 21 expectations for source mapping, paired contracts, task options, task/company/empty guards, manager permission, and file-backed restart. The existing All Timesheets focused regression is rerun with this slice.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-task-filter/`: desktop applies Task = Create new components and renders `1-25 / 25` with `38:00`; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile capture is blocked before authentication because shared page discovery rejects `actions[1].title is not allowed`; exact output is in `core3-readiness.txt`. Odoo Print/PDF/action surfaces remain open; no module sign-off is claimed.

## Wave 18 All Timesheets My filter — `TIMESHEET-ALL-MY-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's actor-scoped `mine` search filter labelled `My Timesheets` in `hr_timesheet_line_search`, used by the `timesheet_action_all` All Timesheets action. This is distinct from the completed Employee, Project, and Task record filters and from the separate personal Timesheets route.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds the My Timesheets filter, and the API applies the actor predicate against `current_user_name` while retaining manager permission, company, and empty-fixture guards. Existing persisted `timesheet_entries.employee_name` ownership supplies durable state, so no duplicate migration was added.

Focused coverage is `test/timesheets_all_my_filter.integration.test.ts`: 3 tests / 18 expectations for source mapping, paired contracts, actor/company/empty guards, manager permission, and file-backed restart. The existing All Timesheets focused regression is rerun with this slice.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-my-filter/`: desktop applies My Timesheets and renders `1-42 / 42` for Mitchell Admin; mobile renders responsive Kanban; both report no browser errors. Core3 desktop/mobile capture is blocked before authentication because the bounded startup probe never exposed backend `3001/api/modules`; exact output is in `core3-readiness.txt`. Odoo Print/PDF/action surfaces remain open; no module sign-off is claimed.
- The repository audit is blocked before completion by an unrelated page-schema options error; exact output is under `evidence/timesheets/2026-09-21/timesheet-all-my-filter/audit-blocker.txt`. No other-owner page was edited.

## Wave 19 All Timesheets Sales Order search — `TIMESHEET-ALL-SALES-ORDER-SEARCH-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's `sale_timesheet` Sales Order search field. `addons/sale_timesheet/views/hr_timesheet_views.xml` inserts `order_id` after Task in the inherited All Timesheets search view and matches both Sales Order and Sales Order Item with `ilike`. This is distinct from the excluded filters, groupings, portal, analysis, and report slices.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The existing durable `timesheet_entries.sales_order_item` relation is now part of the All Timesheets search predicate, and the page search placeholder names Sales Order. The manager permission and current-company/empty guards remain enforced; no duplicate migration was needed. A durable relation-update test confirms a changed sales-order value is visible on the next query, and file-backed restart retains the search.

Focused coverage is `test/timesheets_all_sales_order_search.integration.test.ts`: 4 tests / 19 expectations for Odoo source comparison, paired contracts, durable Sales Order search, permission/company/empty guards, relation-update freshness, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-sales-order-search/`: desktop fills the Sales Order search with `S00035` and renders `1-80 / 113`; mobile captures responsive All Timesheets Kanban; both report no page/request errors. Core3 desktop/mobile capture is blocked before authentication by the unrelated shared `discoverPages` error `components[0].help is not allowed`, recorded in `core3-readiness.txt`. Odoo Print/PDF/report-action surfaces remain open; no module sign-off is claimed.

## Wave 20 All Timesheets Non-Billable filter — `TIMESHEET-ALL-NON-BILLABLE-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's `sale_timesheet` Non-Billable filter. `addons/sale_timesheet/views/hr_timesheet_views.xml` inserts `non_billable` with domain `timesheet_invoice_type = non_billable` into the authenticated All Timesheets search view. This is distinct from the completed Sales Order search and billing report drilldown.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds one manager-scoped Non-Billable option; the API projects and filters the existing durable `timesheet_entries.billing_type`, falling back to its persisted billable flag. Current-company and empty-fixture guards remain enforced; no duplicate migration was needed. A durable relation-update test verifies a concurrent billing-type change is visible immediately, and file-backed restart retains the filter.

Focused coverage is `test/timesheets_all_non_billable_filter.integration.test.ts`: 4 tests / 20 expectations for Odoo source comparison, paired contracts, durable filtering, permission/company/empty guards, relation-update freshness, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-non-billable-filter/`: desktop selects Non-Billable and renders `1-80 / 387`; mobile captures responsive All Timesheets Kanban; both report no page/request errors. Core3 desktop/mobile capture is blocked before authentication by the unrelated shared `discoverPages` error `components[0].header_actions[6].id references unknown action "edit_employee_type"`, recorded in `core3-readiness.txt`. Odoo Print/PDF/report-action surfaces remain open; no module sign-off is claimed.

## Wave 21 All Timesheets Billed on Timesheets filter — `TIMESHEET-ALL-BILLED-ON-TIMESHEETS-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's `sale_timesheet` Billed on Timesheets filter. `addons/sale_timesheet/views/hr_timesheet_views.xml` inserts `billable_time` with domain `timesheet_invoice_type = billable_time` into the authenticated All Timesheets search view. This is distinct from the completed Non-Billable filter, Sales Order search, and billing report drilldown.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds one manager-scoped Billed on Timesheets option; the API exposes the existing durable `billing_type` in its pivot fields and applies the persisted billing-type predicate. Current-company and empty-fixture guards remain enforced; no duplicate migration was needed. A durable relation-update test verifies a concurrent billing-type change is visible immediately, and file-backed restart retains the filter.

Focused coverage is `test/timesheets_all_billed_on_timesheets_filter.integration.test.ts`: 4 tests / 21 expectations for Odoo source comparison, paired contracts, durable filtering, permission/company/empty guards, relation-update freshness, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-billed-on-timesheets-filter/`: desktop selects Billed on Timesheets and renders `1-80 / 92`; mobile captures responsive All Timesheets Kanban; both report no page/request errors. Core3 desktop/mobile capture is blocked before authentication because the bounded backend startup did not expose `127.0.0.1:3001/api/modules` within 18 seconds, recorded in `core3-readiness.txt`. Odoo Print/PDF/report-action surfaces remain open; no module sign-off is claimed.

## Wave 22 All Timesheets Billed at a Fixed Price filter — `TIMESHEET-ALL-BILLED-FIXED-PRICE-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's `sale_timesheet` Billed at a Fixed Price filter. `addons/sale_timesheet/views/hr_timesheet_views.xml` inserts `billable_fixed` with domain `timesheet_invoice_type = billable_fixed` into the authenticated All Timesheets search view. This is distinct from the completed Billed on Timesheets and Non-Billable filters.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds one manager-scoped Billed at a Fixed Price option; the API records the explicit durable `billing_type` filter contract, exposes billing type in the pivot, and applies the existing billing predicate. Current-company and empty-fixture guards remain enforced; no duplicate migration was needed. A durable relation-update test verifies a concurrent billing-type change is visible immediately, and file-backed restart retains the filter.

Focused coverage is `test/timesheets_all_billed_fixed_price_filter.integration.test.ts`: 4 tests / 21 expectations for Odoo source comparison, paired contracts, durable filtering, permission/company/empty guards, relation-update freshness, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-billed-fixed-price-filter/`: desktop selects Billed at a Fixed Price and renders `1-23 / 23`; mobile captures responsive All Timesheets Kanban; both report no page/request errors. Core3 desktop/mobile capture is blocked before authentication because the bounded backend startup did not expose `127.0.0.1:3001/api/modules` within 18 seconds, recorded in `core3-readiness.txt`. Odoo Print/PDF/report-action surfaces remain open; no module sign-off is claimed.
The repository UI audit is blocked by the unrelated shared page-schema error `actions[5].result is not allowed`; exact output is in `audit-blocker.txt`.

## Wave 23 All Timesheets Billed on Milestones filter — `TIMESHEET-ALL-BILLED-ON-MILESTONES-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's `sale_timesheet` Billed on Milestones filter. `addons/sale_timesheet/views/hr_timesheet_views.xml` inserts `billable_milestones` with domain `timesheet_invoice_type = billable_milestones` into the authenticated All Timesheets search view. This is distinct from the completed fixed-price, Billed-on-Timesheets, and Non-Billable filters.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds one manager-scoped Billed on Milestones option; the API records the explicit durable `billing_type` filter contract, exposes billing type in the pivot, and applies the existing billing predicate. Current-company and empty-fixture guards remain enforced; no duplicate migration was needed. A durable relation-update test verifies a concurrent billing-type change is visible immediately, and file-backed restart retains the filter.

Focused coverage is `test/timesheets_all_billed_on_milestones_filter.integration.test.ts`: 4 tests / 21 expectations for Odoo source comparison, paired contracts, durable filtering, permission/company/empty guards, relation-update freshness, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-billed-on-milestones-filter/`: desktop selects Billed on Milestones and renders `1-13 / 13`; mobile captures responsive All Timesheets Kanban; both report no page/request errors. Core3 desktop/mobile capture is blocked before authentication because the bounded backend startup did not expose `127.0.0.1:3001/api/modules` within 18 seconds, recorded in `core3-readiness.txt`. Odoo Print/PDF/report-action surfaces remain open; no module sign-off is claimed.

## Wave 24 All Timesheets Billed Manually filter — `TIMESHEET-ALL-BILLED-MANUALLY-FILTER-001` (2026-09-21)

The next uncovered source-backed behavior is Odoo's `sale_timesheet` Billed Manually filter. `addons/sale_timesheet/views/hr_timesheet_views.xml` inserts `billable_manual` with domain `timesheet_invoice_type = billable_manual` into the authenticated All Timesheets search view. This is distinct from the completed fixed-price, Billed-on-Timesheets, Milestones, and Non-Billable filters.

Core3 keeps `pages/all-timesheets.yaml` layout-only and `api/all-timesheets.yaml` data/action-only, joined by `page.id: all-timesheets`. The page adds one manager-scoped Billed Manually option; the API records the explicit durable `billing_type` filter contract, exposes billing type in the pivot, and applies the existing billing predicate. Current-company and empty-fixture guards remain enforced; no duplicate migration was needed. A durable relation-update test verifies a concurrent billing-type change is visible immediately, and file-backed restart retains the filter.

Focused coverage is `test/timesheets_all_billed_manually_filter.integration.test.ts`: 4 tests / 21 expectations for Odoo source comparison, paired contracts, durable filtering, permission/company/empty guards, relation-update freshness, and file-backed restart.

Authenticated Odoo evidence is under `evidence/timesheets/2026-09-21/timesheet-all-billed-manually-filter/`: desktop selects Billed Manually and renders `1-13 / 13`; mobile captures responsive All Timesheets Kanban; both report no page/request errors. Core3 desktop/mobile capture is blocked before authentication because the bounded backend startup did not expose `127.0.0.1:3001/api/modules` within 18 seconds, recorded in `core3-readiness.txt`. Odoo Print/PDF/report-action surfaces remain open; no module sign-off is claimed.
The repository UI audit passed with 726 pages, 735 routes, and 1,409 datasources; no audit blocker was introduced by this slice.

## Wave 25 Sales Order Item Timesheets action — `TIMESHEET-SALES-ORDER-ITEM-ACTION-001` (2026-09-21)

The next uncovered bounded source behavior is Odoo `sale_timesheet`'s
`timesheet_action_from_sales_order_item` action in
`addons/sale_timesheet/views/hr_timesheet_views.xml`. Its domain is
`so_line = active_id`; its context enables the billable-timesheet and current
week defaults and carries the active sales-order line into the timesheet
surface. This is a scoped action, not the excluded All Timesheets Sales Order
search or any billing filter.

Core3 adds `pages/sales-order-item-timesheets.yaml` and
`api/sales-order-item-timesheets.yaml`, joined by
`page.id: sales-order-item-timesheets`, and a row action from the existing
All Timesheets page. The API uses the durable `timesheet_entries.sales_order_item`
relation, applies the billable/current-week source context, and retains the
manager permission plus company, empty, missing-item, relation-freshness, and
file-backed restart guards. No duplicate persistence model was added.

Focused coverage is `test/timesheets_sales_order_item_action.integration.test.ts`:
4 tests / 22 expectations. The bounded All Timesheets regression passed 54
tests / 329 expectations. ESLint and `git diff --check` passed. The repository
UI audit passed with 729 pages, 738 routes, and 1,419 datasources.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-sales-order-item-action/`.
Core3 authentication was blocked because the backend listener was unavailable
after the bounded startup reached frontend readiness. Authenticated Odoo
capture was blocked because `core3_user_demo` was unavailable (`8069`:
Database not found; `8073`: PostgreSQL connection failure). The exact blockers
are recorded; no desktop/mobile screenshot or sign-off is claimed. Existing
Odoo Print/PDF/report-action gaps remain open.

## Wave 26 All Timesheets Billing Type grouping — `TIMESHEET-ALL-BILLING-TYPE-GROUP-001` (2026-09-21)

The next uncovered bounded source behavior is Odoo `sale_timesheet`'s
`Billing Type` group-by in `addons/sale_timesheet/views/hr_timesheet_views.xml`.
The `groupby_timesheet_invoice_type` filter groups by
`timesheet_invoice_type` for the Sales user group. This is distinct from the
excluded individual billed/non-billable filters.

Core3 adds `Billing Type` to the existing All Timesheets group-by contract and
declares the paired API `group_by_contracts` metadata through the existing
`page.id: all-timesheets` binding. The grouping reads durable
`timesheet_entries.billing_type`; no duplicate persistence model was added.
Manager permission, current-company and empty guards, relation freshness, and
file-backed restart remain enforced.

Focused coverage is `test/timesheets_all_billing_type_group.integration.test.ts`:
4 tests / 17 expectations. The bounded All Timesheets regression passed 58
tests / 346 expectations. ESLint and `git diff --check` passed. The repository
UI audit passed with 729 pages, 738 routes, and 1,419 datasources.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-all-billing-type-group/`.
Core3 and authenticated Odoo captures were blocked by exact runtime failures
recorded in the evidence files; no desktop/mobile screenshot or sign-off is
claimed. Existing Odoo Print/PDF/report-action gaps remain open.

## Wave 28 — `TIMESHEET-MY-FAVORITE-PROJECT-PREFILL-001`

The smallest distinct open source-backed behavior after the prior All/My,
filter, grouping, action, report, and import-template slices is Odoo's New
Timesheet favorite-project prefill. In
`addons/hr_timesheet/models/hr_timesheet.py`, `_get_favorite_project_id()`
searches the current employee's recent five active timesheetable projects,
chooses the mode, and `default_get()` assigns that project for the
`is_timesheet` context.

Core3 keeps `pages/entries.yaml` layout-only and
`api/entries.yaml` data/action-only, joined by `page.id: timesheets`. The page
adds a permissioned `New Timesheet` header action; the API adds the durable
`timesheet_entry_defaults` single-row source and binds it to
`create_timesheet_entry` with `prefill: source`. The source uses persisted
`timesheet_entries`, current employee/company guards, active timesheetable
projects, and deterministic empty behavior. Existing create relation guards
remain the write boundary, so no duplicate migration was needed.

Focused coverage is `test/timesheets_favorite_project_prefill.integration.test.ts`:
3 tests / 17 expectations. Full Timesheets regression passes 215 tests / 1335
expectations across 57 files. UI audit passes 735 pages / 744 routes / 1440
datasources; scoped ESLint and Timesheets-owned diff-check pass.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-my-favorite-project-prefill/`.
Core3 was not listening on port 3001 and Odoo 8069/8073 redirected to
`/web/login`, so authenticated desktop/mobile captures are not claimed.
Existing Odoo Print/PDF/action blockers remain open; no sign-off is claimed.

## Wave 29 — `TIMESHEET-MY-PROJECT-TASK-DEPENDENCY-001`

The next smallest uncovered behavior is the New Timesheet project/task
dependency from Odoo's `hr_timesheet` form. Odoo supplies the selected project
as task context, searches open tasks, and `_onchange_project_id` clears a task
whose project no longer matches. Core3 keeps the layout in the existing
`timesheets` page contract and adds project/task option datasources and
fail-closed create guards to `api/entries.yaml`, joined by `page.id`.

The project and task options are durable reads from `timesheet_projects` and
`timesheet_tasks`, scoped to the current company and active timesheetable
projects. A valid task is canonicalized to its persisted name, no task remains
optional, and a stale, closed, cross-project, or cross-company task is rejected
by the create boundary. No new migration is required because the existing
durable relations are used.

Focused coverage is
`test/timesheets_project_task_dependency.integration.test.ts` — 4 tests / 20
expectations. The full Timesheets regression passes 219 tests / 1355
expectations across 58 files. UI audit passes 737 pages / 746 routes / 1449
datasources; scoped ESLint and Timesheets-owned diff-check pass.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-my-project-task-dependency-001/`.
Core3 was not listening on port 3001 and Odoo 8069/8073 redirected to
`/web/login`, so authenticated desktop/mobile captures and Odoo comparison
captures are blocked; no sign-off is claimed. Existing Odoo Print/PDF/action
blockers remain open.

## Wave 31 — `TIMESHEET-DEPARTMENT-REPORT-CONTEXT-001`

The next smallest open source-backed behavior is the Timesheets action exposed
from Odoo's Department Kanban. `hr_timesheet/views/hr_department_views.xml`
opens `act_hr_timesheet_report` with `search_default_department_id` and
`default_department_id`, so the By Employee report retains the selected
department context rather than only offering an unrelated grouping.

Core3 keeps `pages/timesheets-by-employee.yaml` layout-only and
`api/timesheets-by-employee.yaml` data/action-only, joined by
`page.id: timesheets-by-employee`. The page adds a manager-scoped Department
filter and department column; the API adds a company-scoped department option
source and joins durable `timesheet_employees.department_id` and
`department_name` into the report query. Empty, missing-department,
current-company, manager-permission, relation-refresh, migration replay, and
file-backed restart boundaries remain explicit. No duplicate migration was
needed because the existing durable department relation is reused.

Focused coverage is
`test/timesheets_department_report_context.integration.test.ts`: 4 tests /
30 expectations. Full Timesheets regression passes 227 tests / 1,402
expectations across 60 files. Scoped ESLint and Timesheets-owned
`git diff --check` pass. The repository UI audit is blocked by the unrelated
shared eCommerce page-schema error `actions[1].fields is not allowed`; the
exact output is recorded in the Wave 31 evidence and no eCommerce file was
edited.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-department-report-context-001/`.
Core3 was not listening on port 3001 and Odoo 8069/8073 served only the
unauthenticated `/web/login` surface, so authenticated desktop/mobile captures
and visual sign-off are blocked. Existing Odoo Print/PDF/action surfaces remain
open blockers; no module sign-off is claimed.

## Wave 38 — `TIMESHEET-TASK-ACTION-MULTI-SCOPE-001`

The next uncovered task action behavior is Odoo `timesheet_action_task` with
the domain `task_id in active_ids`. This adds multi-selected-task context to
the task Timesheets action and is distinct from the prior action display name
and single-task descendant expansion slices.

Core3 keeps `pages/task-timesheets.yaml` layout-only and extends
`api/task-timesheets.yaml` with comma-separated `task_ids`, the durable
`task_timesheet_scope` aggregate, and a selected-task membership guard on
create. Existing task and entry relations supply durable persistence; current
company, permission, missing, empty, stale, closed-task, and foreign-company
boundaries remain explicit. The API/page contracts join through
`page.id: task-timesheets`.

Focused coverage is
`test/timesheets_task_action_multi_scope.integration.test.ts`: 4 tests / 22
expectations. Related task/action/report/subtask coverage is 18 tests / 105
expectations. Scoped ESLint and the UI audit pass at 753 pages, 762 routes,
and 1,519 datasources; the Timesheets-owned staged diff check passes.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-multi-scope-001/`.
Core3 refused port 3001 and Odoo 8069/8073 exposed only unauthenticated
`/web/login`, so authenticated desktop/mobile comparison is blocked and no
visual sign-off is claimed. Odoo Print/PDF/action-surface blockers remain
open.

## Wave 46 — `TIMESHEET-PORTAL-TASK-HOURS-SUMMARY-001`

The next uncovered portal task behavior is Odoo's
`project.task._get_portal_total_hours_dict`, used by the portal task list to
show allocated versus effective time without double-counting descendant task
rows. This is distinct from the completed portal action view substitution,
portal list filters/sorting, and task action scope slices.

Core3 extends the existing `portal-task-timesheets` page/API pair, joined by
`page.id: portal-task-timesheets`, with a guarded `StatRow` summary. The
summary reads durable task allocation and direct task entries, so a parent
task's child entry remains in the list but is not counted a second time in the
parent total. Migration
`20260921200000-029-timesheets-portal-task-hours-summary.yaml` persists the
task `allow_timesheets` flag and adds a replay-safe portal-hours index.
Permission, actor, company, missing, empty, and stale task-version guards are
explicit; file-backed relation refresh and restart are covered.

Focused coverage is
`test/timesheets_portal_task_hours_summary.integration.test.ts`: 4 tests / 24
expectations. Related portal/task regression is 22 tests / 157 expectations.
Scoped ESLint and UI audit pass at 766 pages / 775 routes / 1,562
datasources; the exact-path staged `git diff --check` is recorded with the
commit evidence.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-portal-task-hours-summary-001/`.
Playwright reached Core3's login page and Odoo's login page but no authenticated
session was available, so authenticated desktop/mobile captures and visual
sign-off are blocked. Odoo Print/PDF/action-surface blockers remain open; no
module sign-off is claimed.

## Wave 42 — `TIMESHEET-TASK-ACTION-CALENDAR-VIEW-001`

Odoo's `timesheet_action_all` declares a Calendar view, and
`project.task.action_view_subtask_timesheet` retains it for internal users
while restricting rows to the task and descendants. This is distinct from the
completed task-action Kanban and graph slices, project context, multi-scope,
display-name, and earlier Timesheets work.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds a Calendar tab
using `work_date`, `calendar_display_name`, employee, task, description, and
time-spent card fields. It remains joined to the separate durable
`api/task-timesheets.yaml` contract by `page.id: task-timesheets`; the existing
permission, current-company, missing, empty, task-scope, guarded-create,
stale-write, and concurrency boundaries remain enforced. Migration
`20260921191000-025-timesheets-task-action-calendar.yaml` adds a replay-safe
task/company/date/employee lookup index.

Focused coverage is
`test/timesheets_task_action_calendar_view.integration.test.ts`: 4 tests / 21
expectations. The related regression reached 37 passing tests / 198
expectations with one unrelated discovery failure from duplicate Employees
datasource `employee_language_options`; scoped lint passes and the UI audit is
blocked by that same shared-worktree defect. Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-calendar-view-001/`.
Core3 and authenticated Odoo browser capture are blocked, so no visual or
module sign-off is claimed. Odoo Print/PDF/action-surface blockers remain open.

## Wave 44 — `TIMESHEET-TASK-ACTION-FORM-VIEW-001`

Odoo registers `timesheet_view_form_user` and attaches it to
`timesheet_action_all` through `timesheet_action_view_all_form`. The task
Timesheets action inherits that Form view for internal users. Core3's task
action had List, Kanban, Calendar, Pivot, and Graph but no Form tab; this
slice is distinct from every completed task action and earlier Timesheets
slice.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds a Form tab bound
to the existing `timesheet-detail` side-panel page. The task page/API pair
remains joined by `page.id: task-timesheets`; the detail page and
`api/entry-detail.yaml` remain separately joined by `page.id: timesheet-detail`
and provide durable entry fields/actions with permission, company, actor,
missing, empty, guarded-create, stale-write, and concurrency boundaries.
Migration `20260921193000-027-timesheets-task-action-form.yaml` adds a
replay-safe task/company/state/date/version lookup index.

Focused coverage is
`test/timesheets_task_action_form_view.integration.test.ts`: 4 tests / 23
expectations. Related task/action/report coverage is 46 tests / 253
expectations. Scoped ESLint and UI audit pass at 759 pages, 768 routes, and
1,546 datasources; Timesheets-owned diff-check is recorded with commit
evidence. Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-form-view-001/`.
Core3 and authenticated Odoo browser capture are blocked, so no visual or
module sign-off is claimed. Odoo Print/PDF/action-surface blockers remain open.

## Wave 43 — `TIMESHEET-TASK-ACTION-PIVOT-VIEW-001`

Odoo's task Timesheets action inherits the source pivot view from
`timesheet_action_all`: employee rows, date columns, Time Spent as the
`unit_amount` measure, and Timesheet Costs as the `amount` measure. Core3's
task action had List, Kanban, Calendar, and Graph but no Pivot; this slice is
distinct from all completed task action and earlier Timesheets slices.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds a desktop-only
Pivot tab with employee rows, work-date columns, weekly date ranges, Time
Spent, and Timesheet Costs measures. The separate durable
`api/task-timesheets.yaml` contract remains joined by `page.id: task-timesheets`
and exposes the persisted cost projection with permission, current-company,
missing, empty, task-scope, guarded-create, stale-write, and concurrency
boundaries. Migration
`20260921192000-026-timesheets-task-action-pivot.yaml` adds a replay-safe
task/company/employee/date/unit-cost lookup index.

Focused coverage is
`test/timesheets_task_action_pivot_view.integration.test.ts`: 4 tests / 22
expectations. Related task/action/report coverage is 42 tests / 230
expectations. Scoped ESLint, UI audit, and Timesheets-owned diff-check are
recorded with the commit evidence. Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-pivot-view-001/`.
Core3 and authenticated Odoo browser capture are blocked, so no visual or
module sign-off is claimed. Odoo Print/PDF/action-surface blockers remain open.

## Wave 41 — `TIMESHEET-TASK-ACTION-KANBAN-VIEW-001`

The next uncovered branch of Odoo `project.task.action_view_subtask_timesheet`
preserves a Kanban view for internal users (`if view[1] == 'kanban'`). This is
distinct from the completed task graph branch, project context, active_ids
multi-scope, display-name, and earlier Timesheets slices.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds a responsive
Kanban view grouped by employee, with task, date, time-spent, and status card
fields. It remains joined to the separate durable
`api/task-timesheets.yaml` contract by `page.id: task-timesheets`; existing
permission, current-company, missing, empty, guarded-create, stale-context,
and concurrency boundaries remain enforced by the task entry datasource and
mutation. Migration
`20260921190000-024-timesheets-task-action-kanban.yaml` adds a replay-safe
Kanban lookup index.

Focused coverage is
`test/timesheets_task_action_kanban_view.integration.test.ts`: 4 tests / 17
expectations, including source/action mapping, current-company Kanban rows,
guarded durable create, migration replay, and file-backed restart. Related
task/action/report coverage is 34 tests / 187 expectations. Scoped ESLint and
Timesheets-owned `git diff --check` pass; the UI audit passes at 756 pages,
765 routes, and 1,534 datasources.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-kanban-view-001/`.
Core3 desktop/mobile capture is blocked by the unavailable port 3001 runtime;
paired Odoo routes reach only unauthenticated `/web/login`. No authenticated
visual or module sign-off is claimed. Odoo Print/PDF/action-surface blockers
remain open.

## Wave 37 — `TIMESHEET-TASK-ACTION-DISPLAY-NAME-001`

The next smallest open source-backed task behavior is Odoo's
`timesheet_action_task` record-context action. Odoo names it `Task's
Timesheets`, applies the task `active_ids` domain, and opens the list action
with the Timesheets context. This is distinct from the completed task and
subtask scope behavior: this slice preserves the source action title in the
task route.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds the durable,
permission-gated `task_timesheet_action_context` datasource to
`api/task-timesheets.yaml`, joined by `page.id: task-timesheets`. The page
renders the resolved action title through a `StatRow`. The datasource fails
closed for missing, empty, or foreign-company tasks and derives the task name
from the durable task relation; no migration is needed.

Focused coverage is
`test/timesheets_task_action_display_name.integration.test.ts`: 3 tests / 17
expectations, including Odoo source mapping, page/API separation,
permission/company/empty guards, and file-backed restart stability. The
related task/report/subtask regression passes 14 tests / 83 expectations.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-display-name-001/`.
Core3 port 3001 refused both bounded probes and Odoo 8069/8073 redirected to
`/web/login`, so authenticated desktop/mobile captures are blocked and no
visual sign-off is claimed. Existing Odoo Print/PDF/action blockers remain
open.

## Wave 36 — `TIMESHEET-PROJECT-ACTION-DISPLAY-NAME-001`

The smallest remaining source-backed project action behavior is Odoo's
`project.project.action_project_timesheets` display-name branch. A standalone
project action is labeled `<Project>'s Timesheets`; an embedded project action
with `from_embedded_action` keeps the generic `Timesheets` label. This is
distinct from the completed project context default and multi-project action
scope slices.

Core3 keeps `pages/project-timesheets.yaml` layout-only and adds the durable,
permission-gated `project_timesheet_action_context` datasource to
`api/project-timesheets.yaml`, joined by `page.id: project-timesheets`. The
page renders the resolved label through a `StatRow`. The datasource fails
closed for empty, inactive, non-timesheetable, missing-analytic-account, or
foreign-company projects and derives all values from the durable project
relation; no migration is needed.

Focused coverage is
`test/timesheets_project_action_display_name.integration.test.ts`: 3 tests /
18 expectations, including Odoo source mapping, both display-name branches,
page/API separation, permission metadata, current-company/empty guards, and
file-backed restart stability.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-project-action-display-name-001/`.
Core3 port 3001 refused both bounded probes and Odoo 8069/8073 redirected to
`/web/login`, so authenticated desktop/mobile captures are blocked and no
visual sign-off is claimed. Existing Odoo Print/PDF/action blockers remain
open.

## Wave 35 — `TIMESHEET-PROJECT-ACTION-MULTI-SCOPE-001`

The next smallest uncovered project action behavior is Odoo's separate
`timesheet_action_project` record-context action in
`addons/hr_timesheet/views/hr_timesheet_views.xml`. Unlike the completed
single-project `act_hr_timesheet_line_by_project` context-default action, this
action uses `('project_id', 'in', active_ids)` and preserves a multi-project
selection. Its context still marks the form as a Timesheet with `is_timesheet:
1`; it does not supply the Wave 34 single-project `default_project_id`.

Core3 keeps `pages/project-timesheets.yaml` layout-only and extends the paired
`api/project-timesheets.yaml` contract, joined by `page.id:
project-timesheets`. The project list query accepts a deterministic comma-
separated `project_ids` context, joins durable `timesheet_projects`, and
returns only active, timesheetable, analytic-account-backed projects in the
current company. A scope datasource aggregates selected project IDs, names,
entry count, and hours from durable rows. The existing create action accepts a
selected project from the multi-context set and fails closed for a stale
selection; no migration was needed because existing durable project and entry
relations are reused.

Focused coverage is
`test/timesheets_project_multi_scope.integration.test.ts`: 4 tests / 21
expectations, including source/action mapping, page/API separation,
multi-project reads, current-company/active-project/empty guards, durable
multi-context create, stale selection rejection, and file-backed restart.
Authenticated Core3 desktop/mobile capture was blocked because port 3001 had
no listener. Odoo 8069 and 8073 returned HTTP 200 only for `/web/login`, so
authenticated desktop/mobile comparison is not claimed. Exact probes are
recorded under
`evidence/timesheets/2026-09-21/timesheet-project-action-multi-scope-001/`.
Existing Odoo Print/PDF/action surfaces remain open; no module sign-off is
claimed.

## Wave 34 — `TIMESHEET-PROJECT-CONTEXT-DEFAULT-001`

The smallest open source-backed project-context behavior after the prior
employee context, report, dashboard, dependency, filter, grouping, import, and
sub-task slices is Odoo's `act_hr_timesheet_line_by_project`. The action domain
uses `('project_id', '=', active_id)` and its context carries
`default_project_id: active_id`, so a new line opened from a project retains
that project instead of requiring a second manual selection.

Core3 keeps `pages/project-timesheets.yaml` layout-only and adds the durable
`project_timesheet_entry_defaults` datasource plus a source-prefilled
`create_project_timesheet_entry` form to `api/project-timesheets.yaml`; both
contracts remain joined by `page.id: project-timesheets`. The datasource resolves
the active project from durable `timesheet_projects` in the current company.
The create mutation canonicalizes project name/company and fails closed for a
stale project context, foreign company, inactive/non-timesheetable project, or
missing analytic account. Existing durable entry storage is reused, so no
duplicate migration is needed.

Focused coverage is
`test/timesheets_project_context_default.integration.test.ts`: 4 tests / 21
expectations. Related project report/dashboard/dependency data coverage is 18
passing tests / 101 expectations; one discovery-only project contract test is
blocked by a concurrent non-Timesheets YAML parse error. Scoped ESLint and
Timesheets-owned `git diff --check` pass. Full module regression and UI audit
are blocked by that shared discovery boundary.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-project-context-default-001/`.
Core3 refused connections on port 3001 and Odoo 8069/8073 served only the
unauthenticated `/web/login` surface, so authenticated desktop/mobile captures
and visual sign-off are blocked. Existing Odoo Print/PDF/action blockers remain
open; no module sign-off is claimed.

## Wave 33 — `TIMESHEET-EMPLOYEE-CONTEXT-DEFAULT-001`

The smallest open source-backed employee-context behavior after the prior
report, portal, filter, grouping, import, project/task, and sub-task slices is
Odoo's `timesheet_action_from_employee`. Its action domain uses
`('employee_id', '=', active_id)` and its form context carries
`default_employee_id: active_id`, so a new line opened from an employee stays
owned by that employee instead of requiring a second manual selection.

Core3 keeps `pages/employee-timesheets.yaml` layout-only and adds the
`employee_timesheet_entry_defaults` datasource plus a source-prefilled
`create_employee_timesheet_entry` form to
`api/employee-timesheets.yaml`; both contracts remain joined by
`page.id: employee-timesheets`. The datasource resolves the active employee
from durable `timesheet_employees` in the current company. The create mutation
canonicalizes the employee name, persists the current company, and fails closed
for a stale employee context, foreign company, inactive employee, or invalid
project. Existing durable entry storage is reused, so no duplicate migration is
needed.

Focused coverage is
`test/timesheets_employee_context_default.integration.test.ts`: 4 tests / 18
expectations. Related employee/project/task coverage is 17 tests / 100
expectations; full Timesheets regression is 235 tests / 1,445 expectations
across 62 files. Scoped ESLint, UI audit (746 pages / 755 routes / 1,483
datasources), and Timesheets-owned `git diff --check` pass.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-employee-context-default-001/`.
Core3 refused connections on port 3001 and Odoo 8069/8073 served only the
unauthenticated `/web/login` surface, so authenticated desktop/mobile captures
and visual sign-off are blocked. Existing Odoo Print/PDF/action blockers remain
open; no module sign-off is claimed.

## Wave 32 — `TIMESHEET-TASK-SUBTASK-SCOPE-001`

The next smallest open source-backed task behavior is Odoo's
`project.task.action_view_subtask_timesheet`. The source collects the task and
its descendants and opens the Timesheets action with a domain over all those
task IDs. This is distinct from the completed Parent Task group-by: it changes
the task-context record scope and keeps child work visible with the parent.

Core3 keeps `pages/task-timesheets.yaml` layout-only and
`api/task-timesheets.yaml` data/action-only, joined by
`page.id: task-timesheets`. The page defaults the task-context list to an
Include sub-tasks filter and exposes the filter, parent task, and sub-task
state. The API joins durable `timesheet_tasks.parent_task_id` metadata and
expands only when `include_subtasks=true`; absent context retains exact-task
behavior. Migration `20260921160000-021-timesheets-task-subtask-scope.yaml`
adds the deterministic task hierarchy and maps an existing fixed report row to
the child task. Company, permission, empty, missing-task, relation-refresh,
migration replay, and file-backed restart guards remain explicit.

Focused coverage is
`test/timesheets_task_subtask_scope.integration.test.ts`: 4 tests / 25
expectations. The full Timesheets regression passes 231 tests / 1,427
expectations across 61 files. Scoped ESLint, UI audit (743 pages / 752 routes /
1,473 datasources), and Timesheets-owned `git diff --check` pass.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-subtask-scope-001/`.
Core3 was not listening on port 3001 and both Odoo endpoints served only the
unauthenticated `/web/login` surface, so authenticated desktop/mobile captures
and visual sign-off are blocked. Existing Odoo Print/PDF/action surfaces remain
open blockers; no module sign-off is claimed.

## Wave 39 — `TIMESHEET-TASK-ACTION-PROJECT-CONTEXT-001`

The next uncovered task action context is Odoo's
`project.task.action_view_subtask_timesheet`. The source action scopes rows to
the task and descendants and supplies `default_project_id: self.project_id.id`
so a new line opened from that task action retains the task's project.
This is distinct from the completed descendant row scope and task
`active_ids` multi-scope behavior.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds the permissioned
`task_timesheet_entry_defaults` source to
`api/task-timesheets.yaml`, joined by `page.id: task-timesheets`. The source
derives the current-company open task and active timesheetable project from
durable relations; the create form is source-prefilled, canonicalizes task and
project values, and rejects stale project context or task/project mismatches.
Migration `20260921170000-022-timesheets-task-project-context.yaml` adds a
replay-safe task/project context index.

Focused coverage is
`test/timesheets_task_action_project_context.integration.test.ts`: 4 tests /
23 expectations. Related task/action/report coverage is 26 tests / 151
expectations. Scoped ESLint and UI audit pass at 754 pages, 763 routes, and
1,523 datasources; the Timesheets-owned staged diff check is recorded with the
commit evidence.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-project-context-001/`.
Core3 refused port 3001 and Odoo 8069/8073 exposed only unauthenticated
`/web/login`, so authenticated desktop/mobile comparison is blocked and no
visual sign-off is claimed. Odoo Print/PDF/action-surface blockers remain
open.

## Wave 40 — `TIMESHEET-TASK-ACTION-GRAPH-VIEW-001`

The next uncovered task action behavior is Odoo's graph-view replacement in
`project.task.action_view_subtask_timesheet`. The source swaps in
`view_hr_timesheet_line_graph_by_employee` while retaining the task and
descendant Timesheet scope. This is distinct from the completed task/project
contexts, active_ids scope, personal analysis pages, and report previews.

Core3 keeps `pages/task-timesheets.yaml` layout-only and adds a desktop-only
Graph tab categorized by employee with Time Spent as the measure. The API
continues to expose the durable `task_timesheet_entries` datasource with
employee, task, date, and hours fields, preserving current-company,
permission, missing, empty, and descendant-scope guards. The contracts remain
joined by `page.id: task-timesheets`. Migration
`20260921180000-023-timesheets-task-action-graph.yaml` adds a replay-safe task
graph lookup index.

Focused coverage is
`test/timesheets_task_action_graph_view.integration.test.ts`: 4 tests / 19
expectations. Related task/action/report coverage is 30 tests / 170
expectations. Scoped ESLint and UI audit pass at 755 pages, 764 routes, and
1,528 datasources; the Timesheets-owned staged diff check is recorded with the
commit evidence.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-task-action-graph-view-001/`.
Core3 refused port 3001 and Odoo 8069/8073 exposed only unauthenticated
`/web/login`, so authenticated desktop/mobile comparison is blocked and no
visual sign-off is claimed. Odoo Print/PDF/action-surface blockers remain
open.

## Wave 47 — `TIMESHEET-PORTAL-VISIBILITY-DOMAIN-001`

The next uncovered portal behavior is Odoo's `_timesheet_get_portal_domain`:
portal rows are visible through the current partner's project/task relation
only when the project privacy is `invited_users` or `portal`; the controller
applies that domain to `/my/timesheets`. This is distinct from the completed
portal list, sorting, task-hours summary, and task-action portal views.

Core3 preserves the existing layout-only `timesheets-portal` page and its
separate API contract joined by `page.id: timesheets-portal`. Migration
`20260921210000-030-timesheets-portal-visibility-domain.yaml` durably adds
project privacy/version state and active portal relation rows. The API uses a
left relation join so internal employee-owned rows remain readable while
portal users additionally require an active project/task relation and
allowed project privacy; project/company, actor, missing, empty, and stale
version guards fail closed.

Focused coverage passed 4/4 new tests (27 expectations) and the related
related portal regression passed 19/19 tests (136 expectations); one broader task
test also exposed an unrelated shared-worktree page-schema error in another
module (`actions[7].fields must be a non-empty array`). Scoped ESLint passed.
The UI audit is blocked by that same unrelated discovery error. Odoo
authenticated desktop/mobile captures are recorded in the evidence directory;
Core3 capture is blocked because startup fails on the unrelated page-schema
error before ports 3001/3002 become available. Odoo Print/PDF/action surfaces
remain blockers; no sign-off is claimed.

Evidence is under
`evidence/timesheets/2026-09-21/timesheet-portal-visibility-domain-001/`.

## Wave 48 — `TIMESHEET-PORTAL-GROUPING-001`

The next distinct uncovered portal behavior is Odoo's authenticated
`/my/timesheets` group-by workflow. `addons/hr_timesheet/controllers/portal.py`
exposes Date, Project, Parent Task, Task, and Employee groups, while
`hr_timesheet_portal_templates.xml` renders group headers, hides the grouped
column, and displays a summed `Total:` value. The existing Core3 portal list
already had four local group options but lacked Parent Task, the durable parent
projection, and the explicit API group contracts.

Core3 keeps `pages/portal-timesheets.yaml` layout-only and
`api/portal-timesheets.yaml` data/action-only, joined by `page.id:
timesheets-portal`. The page adds Parent Task to the group menu and expands the
search placeholder. The API adds durable `parent_task_id` and normalized
`parent_task_name` to the pivot/query, searches the parent label, and declares
all five group contracts. Existing migration `0.0.17` supplies replay-safe
parent-task values; no duplicate migration was needed.

Focused coverage is
`test/timesheets_portal_grouping.integration.test.ts`: 3 tests / 27
expectations. It verifies Odoo source/template mapping, all group totals,
actor/company/empty guards, migration replay, and file-backed restart. The
related portal regression is 19 tests / 153 expectations. Evidence is under
`evidence/timesheets/2026-09-22/timesheet-portal-grouping-001/`.

Authenticated Odoo desktop and iPhone 14 captures are included. Core3 browser
capture is blocked: the module runtime fails discovery before port 4001 with
three unrelated invalid page-view fields (`graph.category_field`,
`activity.title_field`, and `activity.activity_types`). No visual parity or
module sign-off is claimed while that shared discovery error remains.

## 2026-09-22 `TIMESHEET-ALL-WEEK-DEFAULT-001`

The next non-portal internal action gap is Odoo's All Timesheets default-week
context. `addons/hr_timesheet/views/hr_timesheet_views.xml:484-494` defines
`timesheet_action_all` at `/odoo/all-timesheets` with `search_default_week: 1`
and the `project_id != False` domain. The existing Core3 All Timesheets page
already exposed a This Week filter and a durable fixed-date query, but opened
without that action default.

Core3 now declares `default_filters: { work_date: this_week }` on the
layout-only `pages/all-timesheets.yaml`; the separate `api/all-timesheets.yaml`
contract remains joined by `page.id: all-timesheets`. No persistence or
migration change was needed. The focused test proves the seven deterministic
week rows, current-company empty guard, manager permission and transport-error
boundary, and migration replay/file restart.

Focused coverage is
`test/timesheets_all_week_default.integration.test.ts`: 4 tests / 17
expectations. BrowserSkill could not borrow the authenticated Odoo tab: the
tab was already borrowed by another session (`tab is borrowed by another
session`) and a later borrow request timed out without confirmation. No Odoo
desktop/mobile capture or visual-parity claim is made; the exact blocker is in
`evidence/timesheets/2026-09-22/timesheet-all-week-default-001/`.

## Wave 49 — `TIMESHEET-PORTAL-TASK-REPORT-001`

Odoo source and reference behavior were compared for the portal task `View Details` workflow: `addons/hr_timesheet/controllers/portal.py:175-180` scopes the task report to the portal actor and task, `views/project_task_portal_templates.xml:8-11` exposes the `View Details` link, and `report/report_timesheet_templates.xml:215-222` defines the `timesheet_report_task_timesheets` report. Authenticated Odoo observation confirmed task 107's `Furniture Delivery` report heading, Date/Employee/Description/Time Spent columns, and `Total (Hours) 45:00`.

Core3 implements the distinct workflow through separate `portal-task-timesheet-detail` page/API contracts joined by `page.id`, a guarded durable `timesheet_portal_task_report_runs` migration, and a report-preview page/API rendering persisted lines with Print and Back actions. The mutation enforces portal task/company/actor scope, non-empty data, expected entry count, and task row-version guards; restart and migration replay are covered.

Focused coverage is `test/timesheets_portal_task_report.integration.test.ts`: 4 tests / 32 expectations. The related portal regression is 22 tests / 174 expectations. UI audit (807 pages, 816 routes, 1671 datasources), frontend build, Timesheets CSS build, and diff checks passed. BrowserSkill captured the authenticated Odoo desktop flow, but the session closed before Core3 navigation/capture export; the exact `session not registered or already stopped` blocker is recorded in `evidence/timesheets/2026-09-22/timesheet-portal-task-report-001/`. No Core3 desktop/mobile or Odoo mobile capture, visual-parity claim, or QWeb/PDF equivalence claim is made.

## 2026-09-22 `TIMESHEET-MY-BILLING-TYPE-GROUP-001`

- Selected the next missing stable-ID behavior on the internal My Timesheets
  action: Odoo's Sales Timesheet extension adds the `Billing Type` Group By
  option through `sale_timesheet/views/hr_timesheet_views.xml`. This does not
  repeat the completed dashboard, task, or report slices.
- Core3 keeps the layout-only `pages/entries.yaml` and data/API
  `api/entries.yaml` contracts separate and joined by `page.id: timesheets`.
  The page now exposes Billing Type in the shared group control; the API
  projects the durable `billing_type` value and declares its pivot/group
  contract. Existing migration `0.0.5` already owns the replay-safe column,
  so no duplicate migration was added.
- Focused coverage passed 4/4 tests with 18 expectations. The isolated My
  Timesheets regression passed 31/31 tests with 194 expectations. Audit,
  frontend build, Timesheets CSS build, focused ESLint, and owned diff-check
  passed.
- BrowserSkill confirmed the live authenticated Odoo My Timesheets action and
  Billing Type menu state, with desktop and iPhone 14 captures under the
  feature evidence. The required existing-tab borrow timed out, so no
  borrowed-tab or visual-parity claim is made; Core3 captures and module
  sign-off remain open.
- Evidence is under
  `evidence/timesheets/2026-09-22/timesheet-my-billing-type-group-001/`.

## 2026-09-22 `TIMESHEET-MY-INVOICE-GROUP-001`

- Selected the next missing stable-ID behavior on the internal My Timesheets
  action: `sale_timesheet` adds the Sales-user `Invoice` Group By option using
  `timesheet_invoice_id`. The live Odoo action exposes Invoice beside Sales
  Order Item and Billing Type; Core3 previously had no invoice projection or
  group contract.
- Core3 keeps the layout-only `pages/entries.yaml` and data/API
  `api/entries.yaml` contracts separate and joined by `page.id: timesheets`.
  Migration `0.0.32` adds replay-safe `invoice_id`/`invoice_name` fields and a
  deterministic fixed-date invoice relation projection. The datasource exposes
  both fields and declares Invoice grouping against the durable relation while
  retaining current-user, company, empty-fixture, and restart guards.
- Focused coverage is
  `test/timesheets_my_invoice_group.integration.test.ts`: 4 tests covering
  source mapping, deterministic grouping, concurrent relation freshness, and
  migration replay/file-backed restart.
- BrowserSkill observed authenticated Odoo `/odoo/timesheets` and checked the
  live Invoice group menu. The required authenticated user-tab borrow was
  blocked because tab `1770662590` was already borrowed by session `gvwd`.
  A task-created authenticated tab was usable for observation, but screenshot
  export was blocked first by a stopped session and then by `No space left on
  device`; no screenshot or visual-parity claim is made.

Evidence is under
`evidence/timesheets/2026-09-22/timesheet-my-invoice-group-001/`.
This is a bounded feature record, not Timesheets module sign-off.

## 2026-09-22 `TIMESHEET-MY-SEARCH-SCOPE-001`

- Selected the next smallest stable-ID gap on the internal My Timesheets
  action. Odoo's primary `hr_timesheet_line_my_timesheet_search` view replaces
  Employee, Department, and Manager fields and removes their group-by filters;
  those controls were still exposed by the Core3 My Timesheets page even
  though its durable API projection is valid for other actions and reports.
- Core3 keeps `pages/entries.yaml` layout-only and `api/entries.yaml`
  data/action-only, joined by `page.id: timesheets`. The page now exposes only
  the Odoo My Timesheets groupings while retaining persisted employee,
  department, and manager fields in the permissioned `timesheets.read`
  datasource. No new migration was needed: the existing deterministic relation
  data remains durable and restart-safe.
- Focused coverage is
  `test/timesheets_my_search_scope.integration.test.ts`: 3 tests / 19
  expectations. The related My Timesheets suite passes 31 tests / 194
  expectations after correcting the earlier department/manager UI assertions
  to match Odoo's primary search view.
- BrowserSkill task-owned authenticated Odoo verification against
  `http://localhost:8069`, database `core3_reference`, confirmed the loaded
  My Timesheets Group By menu at desktop width and a mobile loaded list. The
  required user-tab borrow was blocked because the only visible Odoo tab was
  already borrowed by session `goea`; no credentials or tokens were accessed.
  Odoo captures are under
  `evidence/timesheets/2026-09-22/timesheet-my-search-scope-001/`.
- Core3 visual capture is blocked by the shared runtime startup failure
  `Conflicting declarations for named action: base.activities.reschedule_today`;
  the exact failure is recorded beside the captures. No Core3 visual parity or
  module sign-off is claimed. Odoo Print/PDF/action-surface gaps remain open.
