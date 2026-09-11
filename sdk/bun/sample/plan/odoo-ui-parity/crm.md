# CRM — implementation sub-plan

Status: `ready`

This is a plan gate only. Do not add product pages, components, migrations, or
runtime code as part of this artifact. Implementation is approved only after
the reference preconditions and acceptance checks below are satisfied.

## Reference and source gate

- Odoo addon/version: `crm`, Odoo 19 Community, with its declared dependencies
  (`sales_team`, `mail`, `calendar`, `contacts`, `utm`, `resource`, and related
  base setup modules).
- Source checkout: `/home/nhanjs/projects/odoo/addons/crm`; the authoritative
  menu contract is `views/crm_menu_views.xml`, with lead views/actions in
  `views/crm_lead_views.xml`, team views in `views/crm_team_views.xml`, and
  configuration views in the other `crm_*_views.xml` files.
- Live authenticated audit: `http://localhost:8069` on 2026-09-10 with the
  supplied admin session. `ir.module.module` reports `crm: uninstalled`, the
  Odoo home menu does not show CRM, and `/odoo/crm` resolves to
  `/odoo/discuss`. This is the current reference state, not CRM parity
  evidence. Do not install or mutate the Odoo database during implementation
  without an explicit environment decision.
- Official demo data: the addon manifest declares
  `data/crm_team_demo.xml`, `data/crm_stage_demo.xml`,
  `data/crm_team_member_demo.xml`, and `data/crm_lead_demo.xml`, but those
  records are not active in the current database because the module is
  uninstalled. A fresh reference database must install CRM with demo data
  enabled before visual or row-level comparison is signed off. Record the
  database, module state, demo flag, user groups, and row counts in the batch
  evidence.

## Complete visible menu and action inventory

The following is the installed-addon inventory, filtered by the admin/sales
groups that control visibility. Conditional or technical entries are retained
so implementation cannot silently omit a permission-dependent surface.

### CRM > Sales

| Menu | Odoo action | Required reference surface |
| --- | --- | --- |
| My Pipeline | `crm.action_your_pipeline` | Pipeline kanban entry, then list, graph, pivot, form, calendar, and activity views |
| My Activities | `crm.crm_lead_action_my_activities` | Activity-oriented list/kanban/graph/pivot/calendar/form/activity views, due and overdue states |
| Teams | `sales_team.crm_team_action_pipeline` | Team dashboard/pipeline, team list/kanban/form, team drill-down |
| Customers | `base.action_partner_form` | Contact/customer list, kanban, form, relation popovers, empty/search states |

### CRM root and CRM > Reporting

| Menu | Odoo action | Required reference surface |
| --- | --- | --- |
| Leads | `crm.crm_lead_all_leads` | Lead list/kanban/graph/pivot/calendar/form/activity views |
| Reporting > Forecast | `crm.action_opportunity_forecast` | Forecast kanban, graph, pivot, list, and form states |
| Reporting > Pipeline | `crm.crm_opportunity_report_action` | Opportunity analysis graph, pivot, list, and form states |
| Reporting > Leads | `crm.crm_opportunity_report_action_lead` | Lead analysis graph, pivot, list, and form states |
| Reporting > Activities | `crm_activity_report_action` | Activity analysis/report list, graph, pivot, and filter/group states |

### CRM > Configuration

| Menu | Odoo action/visibility | Required reference surface |
| --- | --- | --- |
| Settings | `crm.crm_config_settings_action`; system admin only | CRM settings form, feature toggles, save/reset, validation, permission denied |
| Opportunities | section, manager group | Opportunity configuration section and its enabled features |
| Sales Teams | `sales_team.crm_team_action_config` | Team list/kanban/form, members, assignment and archive states |
| Teams Members | `sales_team.crm_team_member_action`; `base.group_no_one` | Technical member list/kanban/form and access boundary |
| Activities > Activity Types | `sales_team.mail_activity_type_action_config_sales` | Activity type list/form, active/archive and relation options |
| Activities > Activity Plans | `mail_activity_plan_action_lead`; manager group | Plan list/kanban/form, ordered steps and activity type selection |
| Recurring Plans | `crm.crm_recurring_plan_action`; `crm.group_use_recurring_revenues` | Recurring-plan list/search and feature-disabled absence |
| Pipeline > Stages | `crm.crm_stage_action`; `base.group_no_one` | Stage list/form, sequence, probability, folded and active states |
| Pipeline > Tags | `sales_team.sales_team_crm_tag_action` | Tag list/kanban/form, color, active/archive and opportunity relation |
| Pipeline > Lost Reasons | `crm.crm_lost_reason_action` | Lost-reason list/form, active/archive and lost-opportunity flow |
| Import & Synchronize | no window action | Visible menu/disabled or deliberate redirect state; never invent a working importer |

## View, workflow, and interaction states

The CRM lead model is the central surface. The implementation must cover lead
versus opportunity, new/qualified/proposition/won/lost, archived, assigned and
unassigned, overdue and scheduled activity, recurring revenue when enabled,
and team-scoped visibility. On list and kanban surfaces include search,
faceted filters, group-by, sort, pager, selectable rows, bulk actions, quick
create, open/double-click detail navigation, and no-results/empty/error states.

The detail form must include customer/contact and salesperson/team relations,
stage/probability/revenue/expected-closing fields, tags, source/campaign,
phone/email, activities, followers, chatter messages and notes, attachments,
quotation smart action, and the Odoo status bar. Exercise create, edit,
discard, save, qualify, convert lead to opportunity, convert and create
customer, assign to self, move to proposition, win, lose with required lost
reason, reopen, merge, schedule/complete activity, send message, log note,
add/remove follower, upload/download/preview attachment, and create quotation.
Verify hidden/disabled actions at terminal stages and stale-row/conflict
responses.

Reporting must have deterministic graph, pivot, list, and forecast states with
date/team/stage/source filters, totals, empty result, and mobile overflow.
Settings and configuration must include their actual Odoo group-dependent
controls, not merely a generic CRUD list.

## Existing Core3 service and route map

The service is `sdk/bun/sample/services/crm` with manifest menu entry
`/leads`, permissions in `permissions.yaml`, storage in `storage.yaml`, and
CRM migrations through `20260906000000-017-crm-settings.yaml`. Current page
contracts are:

| Core3 page | Intended route | Current API fragment |
| --- | --- | --- |
| `leads` | `/leads` | `api/leads.yaml` |
| `my-pipeline` | `/my-pipeline` | `api/my-pipeline.yaml` |
| `activities` | `/crm-activities` | `api/activities.yaml` |
| `lead-detail` | `/lead-detail` | `api/lead-detail.yaml` |
| `teams` / `team-detail` | `/teams` / `/team-detail` | `api/teams.yaml` / `api/team-detail.yaml` |
| `analysis` | `/analysis` | `api/analysis.yaml` |
| `expected-revenue` | `/expected-revenue` | `api/expected-revenue.yaml` |
| `lost-opportunities` | `/lost-opportunities` | `api/lost-opportunities.yaml` |
| `quality-leads` | `/quality-leads` | `api/quality-leads.yaml` |
| `unattended-leads` / `unassigned-leads` | `/unattended-leads` / `/unassigned-leads` | matching API fragments |
| `tags` / `configuration` / `settings` | `/crm-tags` / `/configuration` / `/settings` | matching API fragments |

These are useful existing seams, not proof of menu parity. Add an explicit
route or a documented deliberate redirect for every installed Odoo menu above.
Keep frontend YAML in `pages/` layout-only. Keep datasource, action, query,
mutation, mock-data, and service-operation contracts in convention-discovered
`services/crm/api/` fragments joined by `page.id`; do not add an explicit
frontend `pages:` manifest list or couple page layout to backend records.

## Datasource and deterministic mock-data contract

Every visible field, badge, relation, chart point, count, activity, chatter
entry, attachment, and dialog option must be returned by a stable CRM-owned
datasource or an explicitly declared service operation. Seed at least two
sales teams, active/inactive members, contacts/companies, leads and
opportunities across all stages, assigned/unassigned records, activities in
each timing bucket, tags, sources/campaigns, lost reasons, recurring plans,
attachments, followers, messages, quotations, and reporting aggregates.

Named fixture states must include `default`, `lead`, `opportunity`, `won`,
`lost`, `archived`, `unassigned`, `overdue`, `empty`, `filtered`, `no_results`,
`permission_denied`, `offline`, `mobile`, and `stale_conflict`. Preserve
stable IDs, timestamps, money/currency values, relation options, stage
probabilities, and aggregate totals so screenshots and tests are reproducible.
Changing from `mock_data` to a later `query` must not change datasource IDs or
page contracts.

Memory mode is a hard boundary: `bun dev --db=ddb --memory` gives each YAML
service its own DuckDB database. CRM SQL must not read Base contacts or Order
orders tables directly. Use declared service operations such as the existing
contacts search and quotation operation, or maintain a CRM-local projection;
ensure every required CRM table is migrated by CRM itself, including saved
views/visibility projections when used. Team-scoped datasources must return a
team column and apply manager-aware predicates. Permissions must exist in the
CRM catalog and all cross-service operations must be declared and tested.

## Required shared primitives

Reuse and audit the existing shell/app menu, control panel, search panel,
filters/group-by, pager, `ListView`, `CardView`, `KanbanView`, `CalendarView`,
`GraphView`, `PivotView`, `OdooFormView`, status bar, relational/many-to-one
selector, tags, monetary/date fields, `StatRow`, `Chart`, modal/dialog,
confirm/notification, responsive form, activity, follower, attachment, and
`OdooChatter` primitives. Record missing behavior as a bounded primitive task
before adding CRM-specific code; do not fork a page-specific replacement for a
shared control.

## Reference routes and screenshot evidence

After CRM is installed with demo data, capture authenticated Odoo and Core3 at
`1440x900` and `390x844`. Use these stable local paths (screenshots remain
outside Git):

- `/tmp/odoo-crm-parity/odoo-pipeline-desktop.png` and
  `/tmp/odoo-crm-parity/odoo-pipeline-mobile.png`
- `/tmp/odoo-crm-parity/odoo-leads-desktop.png` and
  `/tmp/odoo-crm-parity/odoo-leads-mobile.png`
- `/tmp/odoo-crm-parity/odoo-lead-detail-desktop.png` and
  `/tmp/odoo-crm-parity/odoo-lead-detail-mobile.png`
- `/tmp/odoo-crm-parity/odoo-activities-desktop.png` and
  `/tmp/odoo-crm-parity/odoo-activities-mobile.png`
- `/tmp/odoo-crm-parity/odoo-reporting-desktop.png` and
  `/tmp/odoo-crm-parity/odoo-reporting-mobile.png`
- `/tmp/odoo-crm-parity/odoo-configuration-desktop.png` and
  `/tmp/odoo-crm-parity/odoo-settings-mobile.png`
- `/tmp/core3-odoo-parity/crm-pipeline-desktop.png` and
  `/tmp/core3-odoo-parity/crm-pipeline-mobile.png`
- `/tmp/core3-odoo-parity/crm-leads-desktop.png` and
  `/tmp/core3-odoo-parity/crm-leads-mobile.png`
- `/tmp/core3-odoo-parity/crm-detail-desktop.png` and
  `/tmp/core3-odoo-parity/crm-detail-mobile.png`
- `/tmp/core3-odoo-parity/crm-reporting-desktop.png` and
  `/tmp/core3-odoo-parity/crm-reporting-mobile.png`

Each capture record must include the authenticated user/groups, exact route,
Odoo action ID or Core3 page ID, fixture state, viewport, and screenshot path.
The current uninstalled-reference evidence is intentionally preserved at
`/tmp/odoo-crm-live-uninstalled-desktop.png` and
`/tmp/odoo-crm-live-uninstalled-mobile.png`; those images show the fallback
Discuss surface and must not be used for parity sign-off.

## Acceptance checks

- The installed Odoo menu tree above is exhaustively mapped to Core3 routes or
  an explicit documented redirect, with no silent route fallback.
- Authenticated desktop and mobile browser checks exercise every menu/action,
  list/kanban/form/calendar/activity/graph/pivot state that the action exposes,
  plus lead workflow, chatter, activities, attachments, dialogs, search,
  filters, group-by, pagination, empty/no-results, offline, stale-conflict,
  permission-denied, and responsive overflow states.
- Every rendered value comes from a deterministic backend datasource or a
  declared service operation; no page-local records, blank list caused by a
  missing fixture, or image asset is accepted.
- Memory-mode startup waits for `/api/modules`, CRM migrations provision the
  CRM-local schema, cross-service calls use declared operations, and CRM reads
  do not cross-query isolated Base/Order DuckDB tables.
- Permission checks cover salesperson, sales manager, system administrator,
  and a user outside the CRM role; team visibility and visibility-exception
  behavior are asserted with both allowed and denied records.
- YAML discovery validates all page/API joins and action permissions; focused
  CRM integration tests and authenticated Playwright checks pass. Run the
  repository's markdown/YAML checks, `bun test test/crm.integration.test.ts`
  from `sdk/bun/sample` when implementation exists, and `git diff --check`.

## 2026-09-12 Pipeline Stages action evidence

The first bounded configuration slice for the technical-only source action is
implemented and kept separate from the existing combined Configuration page:

| Odoo action | Core3 page/API | Route | Contract |
| --- | --- | --- | --- |
| `crm.crm_stage_action` (fresh demo action id `381`) | `crm-stages` / `crm-stage-detail` | `/crm/stages` / `/crm/stages/detail` | `pages/stages.yaml` + `api/stages.yaml`, joined by `page.id` |

The source was checked against `addons/crm/views/crm_stage_views.xml`: sequence
handle, stage name, won flag, sales teams, folded state, color, rotting
threshold, and requirements are represented. Core3 adds explicit guarded
archive/restore/delete actions and optimistic concurrency for the existing CRM
stage projection. The migration is `20260912130000-023-crm-stage-action.yaml`.

Authenticated visual evidence was captured from the fresh Odoo 19 demo database
`core3_codex_demo_20260912` as `codex@core3.local` (action 381), and from the
Core3 authenticated memory runtime as `admin@tms.local` (page `crm-stages`):

| Surface | Viewport | Screenshot | SHA-256 |
| --- | --- | --- | --- |
| Odoo Stages | 1440x900 | `/tmp/odoo-crm-stages-desktop.png` | `681bf4db5d5ededf5ca2962267cfa5088c2d71ba21976c65b3b9ca72b11011b7` |
| Odoo Stages | 390x844 | `/tmp/odoo-crm-stages-mobile.png` | `d883844edcdc319170fd73b001e24ac0f95a076cfab70d1629db54f15bbfb99b` |
| Core3 Stages | 1440x900 | `/tmp/core3-crm-stages-desktop-boolean.png` | `1164e93caf5d65ecefad7d04c17672c88774904bb28caebdc8151b4b0234d108` |
| Core3 Stages | 390x844 | `/tmp/core3-crm-stages-mobile-boolean.png` | `73f02d73f786d3799948e697578150295ec6a221a55014cecd4c54d5a763f3c5` |

The source has four default demo stages while Core3 retains its existing six
realistic CRM stage fixtures; this is a data-fixture difference, not a route or
layout fallback. Both Core3 captures rendered the expected stage columns with
no page errors or failed requests after the BooleanToggle and optional-column
comparison fix.

Verification: `bun test test/crm.integration.test.ts`
and `test/crm_stages_action.integration.test.ts` pass with 39 tests and 188
assertions; `bun run audit` reports 545 pages, 552 routes, and 946 datasources;
`bun run lint`, frontend build, and `git diff --check` pass.
- Comparison review signs off labels, menu order, view defaults, columns,
  status colors, totals, dialogs, fixed/mobile navigation, and content-only
  scrolling at both reference viewports. Screenshots stay in `/tmp` and are
  never committed.

## Implementation handoff

Proceed in BA-led batches of one coherent feature group at a time: lead and
opportunity workflow; activities/chatter; teams/visibility; reporting;
configuration/settings; then mobile and failure states. After each batch,
record route/action coverage, datasource IDs, service-boundary evidence,
authenticated browser evidence, screenshot paths, and any deliberate parity
exception before starting the next batch.

## Batch: Configuration → Recurring Plans

Status: `implemented`; bounded checkpoint for the installed Odoo action.

Reference evidence (personal live database):

- Database: `core3_personal`; Odoo 19 Community; CRM module installed at
  version `19.0.1.9`; authenticated user `codex@core3.local`.
- Odoo menu: `CRM → Configuration → Recurring Plans` when the recurring-revenue
  group is enabled; action `crm.crm_recurring_plan_action` (ID `402`), model
  `crm.recurring.plan`, view mode `list`.
- The authoritative list view is `editable="bottom"` with the sequence handle,
  `Plan Name`, and `# Months` columns. The search view exposes the `Archived`
  filter. Live active rows are Monthly (1), Yearly (12), Over 3 years (36), and
  Over 5 years (60).
- Reference captures: `/tmp/odoo-crm-recurring-plans/odoo-recurring-plans-desktop.png`
  at 1440×900 and `/tmp/odoo-crm-recurring-plans/odoo-recurring-plans-mobile.png`
  at 390×844.

Core3 implementation:

- Page/API contracts are joined by page ID `recurring-plans`; the layout is
  `pages/recurring-plans.yaml` and the datasource/actions are in
  `api/recurring-plans.yaml`.
- Route: `/recurring-plans`; manifest label: `Recurring Plans`; datasource:
  `crm_recurring_plans`; migration: `0.0.19` in
  `20260911180000-019-recurring-plans.yaml`.
- Fixtures preserve the four Odoo active rows and add the deterministic
  archived `Legacy quarterly` row for the Archived state. Reads cover default,
  search, archived, empty, no-results, forbidden, and transport-error states.
  Manager-only create/update/archive/unarchive mutations validate names and
  month ranges, reject duplicates, and require row-version concurrency.
- Focused validation: `bun test test/crm_recurring_plans.integration.test.ts` —
  3 tests passed, 38 assertions.
- Authenticated Core3 captures: `/tmp/core3-crm-recurring-plans/core3-recurring-plans-desktop.png`
  at 1440×900 and `/tmp/core3-crm-recurring-plans/core3-recurring-plans-mobile.png`
  at 390×844. The browser pass reached `/crm/recurring-plans`, returned the four
  deterministic active rows, reported no page errors or unexpected failed
  requests, and measured `scrollWidth === innerWidth` at both viewports.
- The desktop comparison uses a CRM-scoped table rule so the sequence handle
  and `# Months` column stay narrow like Odoo; the mobile comparison hides the
  handle and keeps the two visible columns inside the viewport.

Known visual limits: Core3 uses the shared Fluent shell rather than Odoo's
purple shell/top bar, and Core3's compact mobile control bar is denser than
Odoo's. Odoo's generic selected-row archive menu is represented by explicit
guarded archive/unarchive actions in the Core3 contract. The reference and
Core3 screenshots remain outside Git.

## Batch: Reporting -> Forecast

Status: `implemented`; bounded checkpoint for the installed Odoo Forecast
action, outside the already-covered CRM lifecycle, configuration, tags, teams,
activities, Sales Teams, and Recurring Plans slices.

Reference evidence (personal live database):

- Database: `core3_personal`; Odoo 19 Community; CRM module installed at
  version `19.0.1.9`; authenticated user `Mitchell Admin`
  (`codex@core3.local`), with the administrator role and CRM reporting access.
- Odoo menu: `CRM -> Reporting -> Forecast`; XML action
  `crm.action_opportunity_forecast`, resolved in this database to action ID
  `412`, model `crm.lead`, view modes `kanban,graph,pivot,list,form`.
- The action defaults to `Upcoming Closings`, `My Pipeline`, and
  `Expected Closing: Month`. The live Forecast kanban showed deterministic
  month columns from September through December 2026, including prorated
  revenue and won/opportunity cards.
- Authenticated Odoo captures, inspected at the requested viewports:
  `/tmp/odoo-crm-forecast/odoo-forecast-desktop-20260911.png` at 1440x900
  (SHA-256 `cc85f2f8255ae0fc6f4ac63f73c56daec0880908c4db9ee7117aedf87880c75e`)
  and `/tmp/odoo-crm-forecast/odoo-forecast-mobile-20260911.png` at 390x844
  (SHA-256 `6b3da217da795159fa016b6ee19e22f52b04004091788b349f291593ab26e17f`).

Core3 implementation and evidence:

- Page/API contracts join through page ID `forecast`: layout
  `services/crm/pages/forecast.yaml`; datasource, option sources, navigation
  action, and error states `services/crm/api/forecast.yaml`.
- Route: `/crm/forecast`; manifest label `Forecast` under CRM -> Reporting;
  datasource `crm_forecast_opportunities`; deterministic migration
  `20260911194000-020-forecast-fixtures.yaml` (`0.0.20`). The page exposes
  Odoo-style List and Kanban tabs, Upcoming Closings/All Opportunities,
  Sales team and Salesperson filters, expected-closing grouping, prorated
  revenue, row navigation to the existing lead form, and `crm.read` access.
- The migration adds four stable upcoming opportunities alongside the existing
  CRM demo opportunity. The datasource covers default, search, team filter,
  empty, no-results, forbidden, and transport-error states without using
  current-date or generated-ID fixtures.
- Focused validation: `bun test test/crm_forecast.integration.test.ts` — 2
  tests passed, 33 assertions. The UI audit passed with 460 pages, 467 routes,
  and 802 datasources; `git diff --check` passed.
- Authenticated Core3 evidence used `admin@tms.local` / `admin123` and reached
  `/crm/forecast`. The desktop List capture was taken with the optional side
  FormView panel closed so the default list geometry is directly comparable to
  the Odoo action. Core3 captures, inspected at the requested viewports:
  `/tmp/core3-crm-forecast/core3-forecast-desktop-20260911.png` at 1440x900
  (SHA-256 `b3b3962dbb21a015bfe2e90a0bf63e4245859ae94c0c4b46b288ce6819367d4e`)
  and `/tmp/core3-crm-forecast/core3-forecast-mobile-20260911.png` at 390x844
  (SHA-256 `1422a0f4725afbd590128d1c2520314db952352625fb03f2f59e7dda90fa6f6f`).
- Final authenticated browser checks reported no Core3 console errors or
  failed requests, exact viewport width (`scrollWidth === innerWidth`) at
  both viewports, five deterministic rows, and visible mobile Kanban cards.
  The Odoo mobile pass had no console errors; three image/action requests were
  browser-aborted while the responsive view settled and did not affect the
  captured Forecast surface.

Known visual limits for this slice: Core3 uses the shared Fluent shell and
compact responsive cards while Odoo uses its purple shell and Forecast Kanban
month columns by default. The Core3 desktop List tab and mobile Kanban tab are
deliberate supported representations of the same installed action. All four
captures and their hashes remain outside Git.

## Batch: Reporting -> Activities Analysis

Status: `implemented`; bounded checkpoint for the previously uncovered CRM
activity report action.

Reference evidence (authenticated Odoo 19, database `core3_codex_demo`, user
`codex@core3.local`):

- Menu: `CRM -> Reporting -> Activities`; source menu
  `/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml`, XML ID
  `crm.crm_activity_report_menu`, sequence 4, action `crm_activity_report_action`.
- Action source
  `/home/nhanjs/projects/odoo/addons/crm/report/crm_activity_report_views.xml`
  (`crm.crm_activity_report_action`), resolved live to action ID `417`, name
  `Activities`, model `crm.activity.report`, route
  `/odoo/action-417`, and view modes `graph,pivot,list`. Its context defaults
  `Trailing 12 months`, groups the pivot by completion month and activity type,
  and uses a bar graph grouped by month and subtype.
- The graph view is `crm_activity_report_view_graph`; the pivot view is
  `crm_activity_report_view_pivot` with activity type columns and month rows;
  the list view is `crm_activity_report_view_tree` with Date, Assigned To,
  Activity Type, optional Body/Company, and Lead Tags. The search view
  `crm_activity_report_view_search` exposes Activity Type, Opportunity,
  Salesperson, Team, Assigned To, Lead Tags, Leads, Opportunities, Won, Lost,
  Trailing 12 months, Archived, and the reporting group-bys.
- Odoo interaction: the view switcher changes Graph/Pivot/List in place;
  Measures and chart controls change the analytic presentation; search facets
  and the `Trailing 12 months` filter update the report without leaving the
  action. The empty state text is `Let's get to work!` followed by
  `Activities marked as Done on Leads will appear here, providing an overview
  of lead interactions.`

Core3 implementation and evidence:

- Page/API contracts join through page ID `crm-activity-report`:
  `services/crm/pages/activity-report.yaml` is presentation-only and
  `services/crm/api/activity-report.yaml` owns the page-bound datasource,
  filters, pivot query, permissions, and failure contracts. Route:
  `/crm/activity-analysis`; manifest label `Activities` under CRM -> Reporting;
  datasource `crm_activity_report`.
- Migration
  `services/crm/migrations/20260911200000-021-activity-report-fixtures.yaml`
  is deterministic and idempotent. It provides six completed activities with
  stable IDs, dates, activity types, opportunities, authors, teams, stages,
  and descriptions. The slice supports default trailing-year results, search,
  activity type filtering, completion-month grouping, no-results/empty states,
  `crm.read` authorization, and explicit unauthorized, forbidden, conflict,
  and transport-error contracts.
- Browser evidence used the isolated runtime `http://localhost:3072` with
  backend `http://127.0.0.1:3071` and event mediator `ws://127.0.0.1:3073`.
  The fresh authenticated Core3 context showed all six report rows and passed
  `fullPage: false` captures at exact 1440x900 and 390x844 viewports:
  `/tmp/core3-odoo-parity/crm-activity-report-20260911/core3-activity-report-list-desktop.png`,
  `/tmp/core3-odoo-parity/crm-activity-report-20260911/core3-activity-report-pivot-desktop.png`,
  and `/tmp/core3-odoo-parity/crm-activity-report-20260911/core3-activity-report-mobile.png`.
  The corresponding Odoo references are
  `/tmp/core3-odoo-parity/crm-activity-report-20260911/odoo-activity-report-list-desktop.png`,
  `/tmp/core3-odoo-parity/crm-activity-report-20260911/odoo-activity-report-pivot-desktop.png`,
  and `/tmp/core3-odoo-parity/crm-activity-report-20260911/odoo-activity-report-mobile.png`.
  All captures are outside Git and are not evidence from the rejected raw
  `/tmp/core3-odoo-parity/crm-activity-report-{desktop,mobile}.png` files.
- CSS gate: generated ignored artifacts with `bun run css:build:global` and
  `bun run css:build:crm`. The shared base stylesheet no longer imports the
  unavailable Google Fonts URL; this is retained because that import was the
  only Core3 failed request in the rejected runtime evidence, while the
  declared system font fallback preserves the rendered surface and lets the
  authenticated browser gate complete without external font traffic.
- Final browser checks reported no Core3 page errors, no failed requests, and
  no document/body horizontal overflow at either viewport. Visual review
  confirmed styled shell, tabs, filters, six visible list rows, and populated
  pivot measures. Focused validation: `bun test
  test/crm_activity_report.integration.test.ts` — 3 tests passed, 19
  assertions. `bun run audit` passed with 509 pages, 516 routes, and 897
  datasources; `bun run lint` and `git diff --check` passed.

Known visual limits: Odoo's live report has no persisted completed activity
rows in this database and therefore shows its sample/empty analytic canvas,
while Core3 deliberately seeds six deterministic rows so the parity slice is
testable. Core3 uses the shared Fluent shell instead of Odoo's purple shell;
the mobile list preserves the shared table's compact horizontal presentation
within a viewport-bounded document rather than adding a bespoke renderer.
