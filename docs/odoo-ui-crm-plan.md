# Core3 Odoo UI and CRM Clone Plan

## Objective

Rebuild the Odoo Community user interface and the reusable framework required to
support Odoo Community and Enterprise-style applications. The first vertical
slice is three CRM screens implemented with Core3's YAML-first architecture.

The Odoo checkout at `/home/nhanjs/projects/odoo` is the behavioral and visual
reference. Core3 remains the product; Odoo source is not an application runtime
dependency.

UI implementation constraints:

- Framework components construct markup through `lib/html.ts`'s fluent API;
  direct DOM construction is reserved for integration boundaries and browser
  APIs.
- CRM styles are authored in SCSS and compiled to browser CSS during the app
  start/dev command.

## Scope change

`apps/tms` is no longer a product milestone. It is only an example and must not
drive framework architecture, naming, schemas, or acceptance criteria. New
framework work belongs in `lib/`, generic documentation belongs in `docs/` and
`spec/`, and the CRM example belongs in a new client fixture or application
owned by this project.

Out of scope for the first slice:

- Implementing the full CRM business backend
- Accounting, sales, inventory, HR, website, or other Odoo applications
- Matching every mobile or public website screen
- Reusing TMS domain models or TMS page YAML

## Definition of done for the first slice

The result is accepted only when all of the following are true:

1. A user can open an Odoo-like web client with the global shell, app menu,
   breadcrumb/action navigation, control panel, notifications, user menu, and
   responsive layout.
2. The three CRM screens are rendered from YAML metadata and share the same
   model, action, field, search, security, and relational primitives.
3. List, kanban, form, search/filter, quick create, edit, archive, delete,
   assign, stage change, activity scheduling, chatter, and navigation work on
   the CRM fixture.
4. The same action can switch between list, kanban, calendar, graph, pivot, and
   form view definitions without page-specific TypeScript.
5. The CRM fixture runs against DuckDB with seeded relational data and supports
   the required read/write workflows without a separate database service.
6. Visual regression captures compare the shell and three CRM screens at
   desktop and narrow viewport sizes.
7. No acceptance flow imports `apps/tms` or depends on TMS data.

## The first three CRM screens

### 1. Pipeline

Reference: Odoo `crm_lead_action_pipeline` and
`crm_case_kanban_view_leads`.

Primary view: grouped opportunity kanban by `stage_id`.

Required behavior:

- App/menu entry: CRM > Sales > My Pipeline
- Search bar with saved filters, facets, group-by, and favorite filters
- Stage columns with counts, folded stages, drag/drop stage transition
- Opportunity cards with priority, tags, customer, salesperson, expected
  revenue, next activity, and activity status
- Quick create in a stage
- Open, edit, archive, delete, assign, mark won, and mark lost actions
- Switch to list, calendar, graph, pivot, and form through one window action
- Team and salesperson context plus permission-driven visibility

### 2. Opportunity / lead form

Reference: `crm_lead_view_form` and the CRM mail integration.

Primary view: responsive form with status bar and record chatter.

Required behavior:

- Create and edit lead/opportunity records
- Lead/opportunity type, title, customer, contact, email, phone, team,
  salesperson, stage, priority, tags, expected revenue, probability, and
  expected closing date
- Relational autocomplete and tag selection
- Statusbar stage transitions and business actions
- Smart/stat buttons for related records and activities
- Notes/HTML field
- Chatter: messages, followers, mentions, attachments, and scheduled
  activities
- Unsaved-change protection, validation, save/cancel, duplicate, archive, and
  delete

### 3. Leads / opportunities list and search

Reference: `crm_lead_all_leads`, `crm_lead_opportunities`,
`crm_case_tree_view_leads`, `crm_case_tree_view_oppor`, and their search views.

Primary view: searchable, sortable, multi-select list.

Required behavior:

- Lead and opportunity modes backed by the same `crm.lead` model
- Search domains with AND/OR conditions
- Predefined filters: assigned to me, unassigned, open, won, lost, overdue,
  expected closing, and activity status
- Group by stage, salesperson, team, customer, source, and closing month
- Column sorting, optional columns, saved filters, favorites, and export
- Multi-select actions, mass edit, archive, delete, assign, and merge entry
- Open the form screen with preserved action/search context

## Architecture work, in order

### Phase 0 — Freeze the target and inventory Odoo

- Record the exact Odoo branch and commit used as the reference.
- Extract CRM manifests, dependencies, models, fields, security files, menus,
  actions, views, demo data, tours, and frontend assets into a traceability
  table.
- Record screenshots and interaction paths for the shell and three screens.
- Define the Core3 YAML contract before implementing visual details.

Deliverable: `docs/odoo-ui-crm-reference.md` with source paths, screenshots,
field/view/action inventories, and an explicit Community/Enterprise marker.

### Phase 1 — Odoo-like web client shell

Add generic framework components and services:

- `WebClientShell`
- `AppLauncher`
- `MainNavbar`
- `Breadcrumbs`
- `ActionControlPanel`
- `ViewSwitcher`
- `SearchBar`
- `SearchFacet`
- `SearchPanel`
- `FavoritesMenu`
- `UserMenu`
- `NotificationCenter`
- `DialogService`
- `CommandPalette`
- `ActionService`
- `MenuService`
- `RouterService`
- `UnsavedChangesGuard`

The shell must consume app/menu/action metadata. It must not contain CRM names
or CRM-specific conditionals.

### Phase 2 — Declarative model and view metadata

Introduce framework contracts for:

- `ModelDefinition`
- scalar fields and field widgets
- `Many2One`, `One2Many`, `Many2Many`, and tags relations
- computed/default/onchange/constraint declarations
- `WindowAction`
- `ViewDefinition`
- view inheritance/extension patches
- domains, contexts, defaults, grouping, ordering, pagination, and aggregates
- menu hierarchy and permissions
- module manifest and dependency loading

Target YAML shape:

```yaml
module:
  id: crm
  depends_on: [base, mail, contacts, calendar]

models:
  crm.lead:
    fields:
      name: { type: char, required: true }
      partner_id: { type: many2one, relation: res.partner }
      stage_id: { type: many2one, relation: crm.stage }
      tag_ids: { type: many2many, relation: crm.tag }

views:
  crm.lead:
    kanban: { source: crm.lead.pipeline.kanban }
    list: { source: crm.lead.opportunity.list }
    form: { source: crm.lead.form }
    search: { source: crm.lead.search }

actions:
  - id: crm.pipeline
    model: crm.lead
    domain: [[type, "=", opportunity]]
    context: { default_type: opportunity }
    views: [kanban, list, calendar, graph, pivot, form]
```

### Phase 3 — Generic Odoo view family

Implement or normalize these framework view types in this order:

1. list and form
2. kanban
3. search and search panel
4. calendar
5. graph and pivot
6. activity
7. gantt and map later

The existing `GridView`, `ListView`, `Kanban`, `Chart`, `FormPanel`, and
`AdvancedSearch` should be evaluated for adaptation before new parallel
components are created. Add adapters where their current contracts are too
TMS-shaped; do not fork them for CRM.

### Phase 4 — CRM shared data and interaction contracts

Implement generic services needed by CRM:

- model query/read/create/write/unlink service
- domain parser and safe parameterized query compiler
- relational lookup/autocomplete service
- action context and default-value resolver
- drag/drop mutation contract
- bulk mutation contract
- archive/restore contract
- activity service
- chatter/message/follower/attachment service
- optimistic concurrency and dirty-record state
- access rights, record rules, and field visibility

### Phase 5 — CRM fixture and three screens

Create a standalone CRM fixture under a new app or development fixture, with no
TMS dependency. Use DuckDB as the development datastore so the fixture starts
without PostgreSQL or another external database service. Seed enough records to
demonstrate:

- multiple sales teams and stages
- assigned and unassigned opportunities
- tags, priorities, revenue, deadlines, activities, messages, and attachments
- permission differences between salesperson and manager
- leads and opportunities sharing the same model

Build the three screens from module YAML and prove that all mutations go
through generic services.

### Phase 6 — Visual and workflow parity

For each screen, validate:

- initial load and empty state
- search, filter, group, sort, and saved filter behavior
- create/edit/save/cancel/delete/archive
- navigation and browser back/forward
- permission and field visibility
- responsive layout
- keyboard focus and common shortcuts
- loading, error, offline, and notification states

Use Odoo reference screenshots only as comparison evidence; behavior and
metadata contracts remain the primary implementation boundary.

## Components to add first

The first component batch should be deliberately small:

1. `WebClientShell`
2. `MainNavbar`
3. `AppLauncher`
4. `Breadcrumbs`
5. `ActionControlPanel`
6. `ViewSwitcher`
7. `SearchBar`
8. `SearchPanel`
9. `FavoritesMenu`
10. `FormNotebook`
11. `Statusbar`
12. `StatButton`
13. `Many2OneAutocomplete`
14. `Many2ManyTags`
15. `One2ManyEditor`
16. `ActivityPanel`
17. `Chatter`
18. `AttachmentGallery`
19. `KanbanColumn`
20. `KanbanRecordCard`

Everything else should be added only when one of the three CRM acceptance
flows proves it is needed.

## Validation commands and artifacts

- Start the CRM development fixture against a local DuckDB file.
- Type validation: `cd lib && bunx tsc --noEmit -p tsconfig.json`
- Run the three CRM workflows in the browser: pipeline, form, and list/search.
- Verify create, edit, stage change, assign, archive, delete, activity, and
  chatter flows against DuckDB.
- Screenshot baselines for shell, pipeline, form, and list/search.
- Traceability report mapping each acceptance behavior to its Odoo source
  reference, YAML declaration, and implementation.

## Non-goals and guardrails

- Do not add CRM logic to `lib/components`.
- Do not make `apps/tms` the example or acceptance target.
- Do not create page-specific components when a generic view, field, action,
  or service contract can express the behavior.
- Do not embed Odoo’s Python server or require Odoo at runtime.
- Do not claim Odoo parity from a passing screen; parity requires the
  shell, interactions, metadata, permissions, and visual workflow evidence.
