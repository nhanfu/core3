# Odoo 19 UI parity - Manufacturing

Status: in-progress (live reference addon is available; full parity remains incomplete)

## 2026-09-10 bounded implementation progress

- The owned authenticated reference database `core3_owned` has Manufacturing
  installed with demo data. The disjoint Configuration / Work Centers action
  (`mrp_workcenter_action`, action 872, model `mrp.workcenter`,
  `list,kanban,form`) is implemented in Core3 as `/work-centers` with a
  presentation-only list/detail pair, page-id-bound API fragments, fixed
  2026-01-15 fixtures, CRUD/archive permissions, and explicit empty/error/
  not-found/validation/conflict states.
- This is one bounded action only; the full manufacturing readiness gate below
  remains open until the other source actions, view modes, integrations,
  permissions, and paired browser evidence are complete.

This is the complete implementation sub-plan for the Core3 `manufacturing`
service. It is plan-only: it does not change product code, install Odoo
addons, or commit images. `ready` is intentionally withheld until the live
addon is installed and the desktop/mobile reference captures and navigation
evidence below exist.

## Reference and evidence boundary

- Odoo source: `/home/nhanjs/projects/odoo`, revision `659759969d535d286b656c96b675e4612b925ddd` (short `65975996`), branch `19.0`.
- Addon: `/home/nhanjs/projects/odoo/addons/mrp`, manifest version `2.0`, name
  `Manufacturing`, application `true`, category `Supply Chain/Manufacturing`,
  dependencies `product`, `stock`, and `resource`.
- Official demo data is declared by the manifest: `data/mrp_demo.xml`. The
  normal data list includes `data/mrp_data.xml`, all MRP menus/views, wizard
  views, report views, and backend assets `mrp/static/src/**/*`.
- Live authenticated check on 2026-09-10: `http://localhost:8069`, database
  `core3_demo`, supplied admin credentials. Authentication returned `uid=2`,
  `is_admin=true`, Odoo server `19.0-20260908`. Authenticated
  `ir.module.module.search_read` returned:
  `name=mrp`, `state=uninstalled`, `latest_version=false`, `demo=false`.
- Because `mrp` is uninstalled, no Manufacturing menu/action/view records are
  live in that database. Directly asserting a live MRP route would be false;
  no Odoo reference screenshot was fabricated. `/tmp` has no manufacturing or
  MRP screenshot. Required future paths are reserved as
  `/tmp/odoo-mrp-desktop-1440x900.png` and `/tmp/odoo-mrp-mobile-390x844.png`,
  but neither exists and neither is evidence yet.
- The persistent `js_repl` Playwright tool and a local Playwright package were
  unavailable in this session. The authenticated RPC status check above is
  recorded; after installation, use authenticated Playwright from menu clicks
  and save only real captures under `/tmp`.

## Gate 1 - addon, manifest, version, and demo status

The source manifest is authoritative for addon scope. It loads security,
digest/mail subtype/template data, MRP base data, all listed view and wizard
XML, reports, and `mrp_demo.xml` only when the database is created with demo
data. The source demo file contains products/components, BOMs, work centers,
operations, manufacturing orders, stock moves/quantities, and transitions
used to make the operations screens non-empty. Do not copy transient source
dates or random database IDs; use stable Core3 fixtures described below.

The live status is a hard evidence limitation, not an assumed empty dataset:
the addon is explicitly uninstalled and its live demo flag is false. Installing
it or changing the shared reference database is outside this plan.

## Gate 2 - complete visible menu, action, route, and view inventory

The following is the source contract. Routes are the Odoo web client route
slugs to record after authenticated menu navigation; action IDs and view modes
are the stable source identifiers. A source action with no menu is still listed
because it is reachable from a button, dashboard, product, stock, or wizard.

### Menu tree and menu actions

| Menu path | Source menu | Action / route | Access |
| --- | --- | --- | --- |
| Manufacturing | `menu_mrp_root` | app root `/odoo/manufacturing` | `group_mrp_user`, `group_mrp_manager` |
| Manufacturing / Operations / Manufacturing Orders | `menu_mrp_production_action` | `mrp_production_action` / `/odoo/manufacturing-orders` | MRP user |
| Manufacturing / Operations / Work Orders | `menu_mrp_workorder_todo` | `mrp_workorder_todo` / `/odoo/work-orders` | `group_mrp_routings` |
| Manufacturing / Operations / Unbuild Orders | `menu_mrp_unbuild` | `mrp_unbuild` / `/odoo/unbuild-orders` | MRP user |
| Manufacturing / Operations / Scrap | `menu_mrp_scrap` | `stock.action_stock_scrap` / stock scrap route | stock user |
| Manufacturing / Planning | `mrp_planning_menu_root` | scheduler server action, no ordinary view | `base.group_no_one` |
| Manufacturing / Products / Bills of Materials | `menu_mrp_bom_form_action` | `mrp_bom_form_action` / `/odoo/bills-of-materials` | MRP user |
| Manufacturing / Products / Products | `menu_mrp_product_form` | `product_template_action` / product route | product user |
| Manufacturing / Products / Product Variants | `product_variant_mrp` | `mrp_product_variant_action` / product variant route | `product.group_product_variant` |
| Manufacturing / Products / Lots/Serial Numbers | `menu_mrp_traceability` | `stock.action_production_lot_form` / stock lot route | `stock.group_production_lot` |
| Manufacturing / Reporting / Work Orders | `menu_mrp_work_order_report` | `mrp_workorder_report` / `/odoo/work-orders-analysis` | routings group |
| Manufacturing / Reporting / Overall Equipment Effectiveness | `menu_mrp_workcenter_productivity_report` | `mrp_workcenter_productivity_report` / `/odoo/oee` | routings group |
| Manufacturing / Configuration / Operations | `menu_mrp_routing_action` | `mrp_routing_action` / `/odoo/operations` | manager + routings |
| Manufacturing / Configuration / Work Centers | `menu_view_resource_search_mrp` | `mrp_workcenter_action` / `/odoo/work-centers` | manager + routings |
| Manufacturing / Configuration / Settings | `menu_mrp_config` | `action_mrp_configuration` / settings action | `base.group_system` |

The source also exposes `mrp_workcenter_productivity_report_oee` (Overall
Equipment Effectiveness), `mrp_workcenter_productivity_report_blocked`
(Productivity Losses), `mrp_workorder_workcenter_report` (Work Orders
Performance), `mrp_workorder_action` variants, inventory-move and stock
replenishment actions, and `mrp_operation_picking` under Inventory / Transfers.
These are cross-module or button/report surfaces and must be mapped explicitly
as supported, deferred, or hidden; never silently replace them with a fake MRP
route. The source report actions are Production Order, BoM Overview, MO
Overview, Finished Product Label (ZPL/PDF), and Work Order.

### Action view modes and view states

| Surface / action | Model | Modes | Required states and controls |
| --- | --- | --- | --- |
| Manufacturing Orders / `mrp_production_action` | `mrp.production` | `list,kanban,form,calendar,pivot,graph,activity` | To-do default, search/filter/group, plan, availability, confirm, produce, cancel, split, merge, lock, scrap, labels, unreserve |
| Manufacturing Orders dashboard variant | `mrp.production` | `list,kanban,form` | picking-type domain/context and planned/waiting/in-progress/to-close cards |
| Manufacturing Order form | `mrp.production` | `form` | statusbar draft/confirmed/progress/to-close/done/cancel, components, work orders, by-products, miscellaneous, chatter, stock/traceability stat buttons |
| Work Orders / `mrp_workorder_todo` | `mrp.workorder` | `list,kanban,form,calendar,pivot,graph` | waiting/ready/progress/finished/blocked, start, pause, block, continue, cancel, plan |
| Work-order reports | `mrp.workorder` | graph/pivot/list/form and list/form/calendar/pivot/graph | work center, operation, production, duration, state, date measures/grouping |
| Bills of Materials / `mrp_bom_form_action` | `mrp.bom` | `list,kanban,form` | search, components, operations, by-products, miscellaneous, BoM overview, routing-time button |
| BoM form | `mrp.bom` | `form` | product/type, quantity/UoM, components inline list/catalog, operations, by-products, attachments, company, validity/effectivity |
| Operations / `mrp_routing_action` | `mrp.routing.workcenter` | `list,kanban,form` | operation, work center, duration, worksheet, dependencies, active/archive |
| Work Centers / `mrp_workcenter_action` | `mrp.workcenter` | `list,kanban,form` | capacity, calendars, alternatives, productivity and work-order stats |
| Work Centers overview | `mrp.workcenter` | `kanban,form` | cards for planned, ready, progress, late, and availability links |
| OEE / productivity | `mrp.workcenter.productivity` | `graph,pivot,list,form` | productivity, losses, work center, operator, duration, date grouping |
| Unbuild Orders / `mrp_unbuild` | `mrp.unbuild` | `list,kanban,form,activity` | draft/done/cancel, unbuild, product, MO, lot/serial, component moves |
| Stock Moves / `action_mrp_production_moves` | `stock.move.line` | `list,form` | raw/finished moves, quantities, lots/serials, reservations |
| Settings / `action_mrp_configuration` | `res.config.settings` | `form` | MRP configuration controls, manager/system access, save/reset |

Named source view records to preserve are `mrp.production` activity/list/form/
kanban/calendar/pivot/graph/search; `mrp.bom` form/list/kanban/search and BOM
line form; routing list/form/kanban/search; workorder editable/list/form/
calendar/graph/pivot/kanban/search; workcenter list/kanban/form/search; OEE
productivity list/form/graph/pivot/search and loss list/form/kanban/search; and
unbuild search/list/kanban/form (including simplified form). Inherited product,
stock picking, stock move, stock rule, stock scrap, warehouse, product-document,
and settings views are integration contracts, not permission to duplicate those
other modules inside Manufacturing.

## Gate 3 - route and screenshot evidence

Required capture matrix after `mrp` is installed in the reference database:

| Viewport | Required evidence |
| --- | --- |
| Desktop 1440x900 | authenticated navigation from Manufacturing menu; each menu action above; populated list/kanban/form; MO tabs and status actions; BoM inline tabs; work-order calendar/pivot/graph; OEE; unbuild; settings; empty, denied, error, and confirmation states |
| Mobile 390x844 touch | same menu reachability; responsive list/kanban/form; MO and BoM forms; work-order cards; filters/action menus; no horizontal overflow; empty, denied, and error states |

For every capture record Odoo action ID, resulting browser URL, model, view
mode, fixture/data state, viewport, and `/tmp` path. Also capture Core3 at the
same dimensions only after implementation. A screenshot from another module,
an uninstalled route, or a synthetic HTML page is not acceptable. Current
status: blocked; there are no Odoo MRP screenshots to compare.

## Gate 4 - Core3 datasource, deterministic fixtures, and API contract

The existing service is `sdk/bun/sample/services/manufacturing`: manifest menu
entries for four routes, permissions `manufacturing.read/write/manage`, DuckDB
storage, migrations `0.0.1` foundation and `0.0.2` demo data, pages for orders,
detail, BOMs, analysis, and a production workflow. Current page files embed SQL
and current prototype coverage is only one BOM, one MO, two work orders, and one
analysis chart. Treat this as a starting inventory, not parity.

Before implementation, move backend SQL, lookups, mutations, and workflows into
convention-discovered `services/manufacturing/api/` fragments keyed by `page.id`;
page YAML must remain presentation-only and API fragments must not be listed as
frontend pages. Use service operations for product, stock, lot, user, company,
and work-center relations; never cross-service SQL.

Every list, form, kanban, calendar, chart, pivot, activity, report, dashboard,
and empty state needs a named backend datasource with `mock_data` (the parent
register references `screen-mock-data.md`, which is absent in this worktree;
the implementation must restore or otherwise adopt that shared contract).
Fixture modes must include `default`, `empty`, `filtered`, `error`, and
`forbidden`, with stable IDs, seeded date `2026-01-15`, stable ordering, and no
`CURRENT_DATE`, `CURRENT_TIMESTAMP`, random UUID, browser-only fixture, remote
asset, or page-local record.

Minimum fixture model:

- products/variants and UoMs; two companies; warehouses/locations; users and
  MRP roles; work centers, calendars, operations, worksheets;
- at least four BOMs with components, operations, by-products, versions,
  archived/active and multi-company cases;
- MOs in draft, confirmed, progress, to-close, done, and cancelled states;
  raw/finished moves, reserved/unreserved, lots/serials, backorder and scrap;
- work orders in waiting, ready, progress, finished, blocked, and cancelled;
  planned/unplanned, late, duration, productivity and loss rows;
- unbuild rows, activities/chatter/attachments, and a deliberately empty MO,
  BOM, work-order, OEE, pivot, graph, calendar, and report result.

API actions must cover create/edit/archive/duplicate where visible, component and
operation line editing, confirm/plan/start/pause/block/continue/produce/close/
cancel/unbuild/split/merge/lock/scrap/labels, availability/reservation,
serial assignment, settings, and report filters. Responses must be stable and
include explicit `401`, `403`, `404`, `409` row-version conflict, and `422`
validation cases. All writes need permission checks, company scope, audit/
chatter events, idempotency, and deterministic refresh sources.

## Gate 5 - shared primitives

Record and reuse these primitives before any manufacturing-specific renderer:
`ListView`, responsive `Kanban`, `FormView`/`OdooFormView`, inline one-to-many
grid and many2one selector, statusbar/status chip, search/filter/group-by,
optional columns, row actions and bulk actions, Calendar, Activity, Pivot,
Chart, report/dashboard/stat cards, tabs/notebook, dialogs/wizards,
attachments/chatter/activities, archive/restore, lot/serial picker, quantity/UoM
editor, and responsive overflow/mobile action menus. Extend a generic primitive
when another module needs it; do not add an MRP-only substitute without recording
the reusable contract and its tests here.

## Gate 6 - acceptance checks and readiness rule

Implementation acceptance must prove, with focused YAML/discovery/service tests
and authenticated browser checks:

- every menu/action/view mode above is supported, deliberately deferred, or
  deliberately hidden with an explanation; no silent route alias;
- fresh install and upgrade are idempotent for DuckDB and supported adapters,
  fixtures are deterministic, page/API separation is valid, and all datasource
  permissions are declared;
- desktop and mobile navigation, search, filters, group-by, sorting, pagination,
  view switching, inline lines, form save/discard, valid and invalid workflow
  actions, reports, empty/loading/error/forbidden states, notifications, and
  no-horizontal-overflow pass; browser network failures are captured;
- ordinary MRP user, routing user, manager, system/settings user, another
  company, and denied user boundaries match Odoo source groups and record rules;
  forbidden mutations stay forbidden and cross-company records stay isolated;
- Odoo and Core3 screenshots are paired by action/mode/state at 1440x900 and
  390x844, stored under `/tmp` only, and no image is committed.

Readiness is `ready` only after the live `mrp` addon is installed, its menus and
views are navigated in an authenticated browser, both Odoo screenshot paths
exist, and all focused validation commands pass. Until then this artifact is
complete as a plan but remains `blocked` and must not authorize implementation.

## Planned focused validation

From `sdk/bun/sample` after implementation:

```sh
bun run audit
bun test test/manufacturing*.test.ts
bun run build:css
git diff --check
```

Also run the module discovery/YAML validator, fresh-install and upgrade matrix,
and the authenticated Playwright desktop/mobile matrix described above. The
current plan-only validation is limited to source/register/service inspection,
the authenticated live addon status query, and Markdown whitespace validation.
