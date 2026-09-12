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
