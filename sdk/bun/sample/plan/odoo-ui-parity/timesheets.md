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
