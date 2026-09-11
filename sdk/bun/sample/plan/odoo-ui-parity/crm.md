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

Known visual limits: Core3 uses the shared Fluent shell rather than Odoo's
purple shell/top bar; Odoo's generic selected-row archive menu is represented
by explicit guarded archive/unarchive actions in the Core3 contract. Final
authenticated Core3 desktop/mobile captures and any responsive differences are
recorded with the next browser validation checkpoint.
