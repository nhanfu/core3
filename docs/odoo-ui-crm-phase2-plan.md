# Odoo Clone — CRM Completion and Multi-App Shell Plan

## Objective

Complete the CRM application as a functional Odoo-style module and add the
cross-application shell needed to switch between CRM, Sales, Inventory, and
future modules. CRM is the only business module in this phase that must be
fully implemented. Other modules may be registered with a truthful
Coming Soon screen so the launcher and navigation are testable without
pretending that their features exist.

The current baseline is the standalone `apps/crm` fixture: pipeline kanban,
lead/opportunity list, form, calendar, graph, pivot, basic chatter, DuckDB
mutations, and YAML-backed menu/action metadata. The current `OdooShell`
incorrectly uses CRM's child menus as its primary navigation and has
placeholders for Activities, Reporting, and Configuration.

## Completion definition

This phase is complete only when:

1. The global shell opens an app launcher and switches between registered
   modules without losing the current user/company context.
2. CRM's menu hierarchy, actions, breadcrumbs, view switcher, search state,
   browser history, and permissions work from metadata rather than app-name
   conditionals in the framework.
3. Every CRM menu in the reference inventory has a real screen or a real
   modal workflow: Sales, Leads, Reporting, Configuration, and Import &
   Synchronize.
4. CRM lead/opportunity workflows cover create, edit, convert, qualify, win,
   lose-with-reason, merge, duplicate detection, archive/restore, delete,
   bulk actions, assignment, activities, followers, messages, attachments,
   and relational customer/team/tag management.
5. CRM reporting is backed by the same model/query contract as operational
   views and supports forecast, pipeline, lead, and activity analysis.
6. Each delivered behavior has an automated browser/API test and a trace from
   Odoo reference source to YAML declaration and implementation.

## Phase 2A — Global web client and app switching

Build this before expanding CRM pages so all subsequent screens use the final
navigation contract.

### Framework work in `apps/lib/`

- Add `AppManifest`, `AppRegistry`, `AppLauncher`, and `ModuleMenuTree`
  contracts. A manifest declares id, name, icon, dependencies, root menus,
  default action, permissions, and status.
- Split `OdooShell` into global chrome and module chrome. The global chrome
  owns the app launcher, company switcher, notifications, user menu,
  command/search entry, and responsive behavior. Module chrome owns CRM's
  menu tree, breadcrumbs, action control panel, and view switcher.
- Add a generic `ActionService` that resolves menu -> action -> view and
  preserves `model`, `domain`, `context`, `view`, `search`, `groupBy`, and
  selected records in the URL.
- Add `UnsavedChangesGuard` to app switching, menu navigation, browser back,
  and record navigation.
- Add a generic `ComingSoon` route for registered but incomplete modules.

### App manifests

- Move CRM's current module metadata behind `/api/modules` and keep its
  business definitions behind `/api/modules/crm`.
- Register `crm` as fully available.
- Register `sales` and `inventory` as visible module entries with explicit
  `status: coming_soon`, icon, label, and target milestone.
- Do not put CRM, Inventory, or Sales names into generic framework components.

### Acceptance flows

- Open launcher -> select CRM -> open Pipeline.
- Open launcher -> select Inventory -> see Coming Soon with correct module
  context -> return to CRM.
- Refresh on a CRM deep link and retain app, menu, action, view, and search
  state.
- Attempt app switch with dirty form -> cancel leaves the form intact;
  confirm proceeds.
- Verify mobile launcher/sidebar behavior and keyboard access.

## Phase 2B — CRM data and workflow foundation

Extend the fixture schema and service boundary before adding screens.

- Replace display-name foreign keys with stable relation ids while retaining
  display labels in responses.
- Add `res.partner`, `res.users`, `crm.team`, `crm.tag`, lost reasons,
  activity types/plans, and recurring plans.
- Add a safe domain/context compiler with parameterized DuckDB queries;
  operational lists, lookups, reports, and counts must share it.
- Add server-side role checks for every mutation and record visibility rule;
  client visibility is only presentation.
- Add lead conversion to opportunity, lost reason capture, duplicate search,
  merge preview/confirmation, and bulk mutation transactions.
- Add optimistic dirty-state/version handling for edits and stage moves.
- Add import preview, validation, commit, and error report as a real workflow.

## Phase 2C — CRM Sales and Leads menus

Implement the reference menu tree in this order:

1. **My Activities** — list/calendar activity records, overdue/today filters,
   mark done, reschedule, open linked lead/opportunity, and create activity.
2. **Teams** — team list/kanban/form, members, quotas, team pipeline counts,
   and team-scoped lead/opportunity actions.
3. **Customers** — customer list/form, contacts, linked opportunities,
   activities, and customer-to-opportunity navigation.
4. **Leads** — lead list/kanban/form, qualification, conversion wizard,
   source/campaign fields, duplicate suggestions, and preserved search
   context after conversion.
5. **Pipeline** — replace prompt-based actions with dialogs and workflows for
   assignment, won, lost reason, archive, delete, merge, and quick create.

All five areas use the shared list, kanban, form, calendar, search, relation,
activity, chatter, and action services. No page-specific database access is
added to `apps/lib/`.

## Phase 2D — CRM Reporting

Implement real routes and shared query definitions for:

- Forecast: expected closing buckets, recurring revenue where configured,
  committed/overdue pipeline, and drill-down to records.
- Pipeline analysis: revenue, count, probability, salesperson/team/stage
  dimensions, date range, measures, graph, pivot, and export.
- Leads analysis: lead creation, conversion, source/team/salesperson
  dimensions, graph, pivot, and drill-down.
- Activities analysis: scheduled/completed/overdue activity measures and
  responsible user/type/date dimensions.

Reports must apply the same permissions and active/archive rules as lists.
Every chart cell or pivot aggregate must provide a record drill-down path.

## Phase 2E — CRM Configuration

Implement manager/system-role screens and mutations for:

- CRM settings and lead/opportunity feature toggles.
- Sales teams and team members.
- Activity types and activity plans.
- Recurring plans.
- Pipeline stages, stage folding/requirements, tags, and lost reasons.
- Import and synchronize entry point with import history/errors.

Hide unauthorized menu entries and enforce authorization on the API. A
salesperson must not be able to reach manager-only configuration by guessing a
route.

## Suggested implementation slices

Each slice should be a small commit with focused verification:

1. `global shell + app registry + launcher`
2. `metadata action router + URL state + dirty guard`
3. `CRM relational schema + domain/query service`
4. `activities + teams + customers`
5. `lead conversion + lost reason + duplicate/merge`
6. `CRM dialogs and bulk/import workflows`
7. `forecast + pipeline/leads/activity reports`
8. `CRM configuration screens and permissions`
9. `cross-module and full CRM browser audit`

## Verification gate per slice

- `cd lib && bun run test -- ...` for framework changes.
- `cd apps/crm && bunx tsc --noEmit -p tsconfig.json` for CRM type changes.
- `cd apps/crm && bun run build:css` after stylesheet changes.
- Fresh DuckDB fixture startup and API tests for every new mutation/query.
- Browser workflow tests at desktop and narrow viewport sizes.
- Role matrix check for salesperson, manager, and system-only actions.
- Back/forward, refresh, empty, loading, error, and unsaved-change paths.
- Update the traceability artifact with the Odoo source file, menu/action id,
  YAML contract, route, and test evidence.

## Explicit non-goals

- Full Sales or Inventory business functionality in this phase.
- Odoo Python execution or a runtime dependency on the Odoo checkout.
- Screenshot comparison as the sole acceptance criterion.
- Page-specific controls in the shared framework when a generic metadata or
  view primitive can express the behavior.
