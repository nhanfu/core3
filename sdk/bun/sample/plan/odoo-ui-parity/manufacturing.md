# Odoo 19 UI parity - Manufacturing

Status: in-progress (live reference addon is available; full parity remains incomplete)

## 2026-09-11 bounded Unbuild Orders follow-up

- Revalidated the next installed visible Manufacturing action in the
  authenticated personal database `core3_personal`: Manufacturing / Operations
  / Unbuild Orders is menu `mrp.menu_mrp_unbuild` (runtime menu `558`), action
  `mrp.mrp_unbuild` (runtime action `861`), model `mrp.unbuild`, and the live
  action path is `/odoo/unbuild-orders`. Its exact modes are
  `list,kanban,form,activity`; the search view exposes Product, Manufacturing
  Order, Draft, Done, Product grouping, and Manufacturing Order grouping. The
  list labels are Reference, Product, Bill of Material, Manufacturing Order,
  Lot/Serial Number, Quantity, Unit, Company, and Status. The form exposes the
  same fields plus Source Location, Destination Location, the Draft/Done
  statusbar, the `Unbuild` button, and the post-completion `Product Moves`
  stat button. Source view records are `mrp_unbuild_search_view`,
  `mrp_unbuild_kanban_view`, `mrp_unbuild_form_view`, and
  `mrp_unbuild_tree_view`.
- The live database has zero persisted `mrp.unbuild` rows; Odoo therefore
  renders its `sample="1"` demonstration rows in the list and kanban views.
  The authenticated Odoo captures intentionally preserve that behavior rather
  than creating a record in the reference database. Mobile Odoo resolves the
  action to Kanban, matching the responsive source view behavior.
- Core3 implements the bounded action at `/manufacturing/unbuild-orders` with
  detail `/manufacturing/unbuild-orders/detail`, and exposes the exact
  `Unbuild Orders` menu under Manufacturing / Operations. The presentation-only
  pages are `manufacturing-unbuild-orders` and
  `manufacturing-unbuild-order-detail`; `api/unbuild-orders.yaml` and
  `api/unbuild-order-detail.yaml` own all datasources and mutations and join
  the pages by matching `page.id`.
- Migration `0.0.11` seeds six stable rows at `2026-01-15`: three Draft and
  three Done orders, two companies, products/BOMs, manufacturing orders,
  lots, locations, activity fields, and product-move counts. The list covers
  default, search, Status/Company filters, empty, not-found, and transport
  error fixtures. Datasources declare explicit 401, 403, 404, and 503 states;
  mutations cover create/edit validation, duplicate references, Draft → Done
  `Unbuild`, row-version stale rejection, and guards preventing Done edits or
  deletion. The focused suite is
  `test/manufacturing_unbuild_orders.integration.test.ts` (4 tests, 47
  assertions), including idempotent migration and route discovery checks.
- Authenticated paired captures (all images remain under `/tmp`) are:
  `/tmp/odoo-manufacturing-unbuild-orders-desktop-1440x900-{list,kanban,form}.png`,
  `/tmp/odoo-manufacturing-unbuild-orders-mobile-390x844-{list,kanban,form}.png`,
  `/tmp/core3-manufacturing-unbuild-orders-desktop-1440x900-{list,kanban,form}-final.png`,
  and `/tmp/core3-manufacturing-unbuild-orders-mobile-390x844-{list,kanban,form}-final.png`.
  The browser matrix reported no failed requests, page errors, or horizontal
  overflow at either viewport. The authenticated desktop workflow capture
  `/tmp/core3-manufacturing-unbuild-orders-desktop-done-final.png` records a
  Draft row changing to Done with revision 2 and two Product Moves.
- Deliberate bounded limits: Odoo's persisted reference is empty and its
  generated sample values are not deterministic; Core3 uses fixed fixtures for
  reproducible comparisons. Core3 renders Product Moves as the exact count
  field but does not add the separate Stock Moves action, and it does not
  synthesize Odoo chatter, attachments, component move lines, or the
  simplified MO-launched wizard. Those cross-module and wizard surfaces remain
  outside this one installed action slice.

## 2026-09-11 bounded Overall Equipment Effectiveness follow-up

- Revalidated the next uncovered visible Manufacturing action in the
  authenticated personal database `core3_personal`: Reporting / Overall
  Equipment Effectiveness is runtime menu `549`
  (`menu_mrp_workcenter_productivity_report`), action `836`
  (`mrp_workcenter_productivity_report`), model
  `mrp.workcenter.productivity`, and route
  `/odoo/equipement-effectiveness` (the Odoo route intentionally uses the
  source spelling `equipement`). Its modes are `graph,pivot,list,form`; the
  context groups by Workcenter and Loss Reason and disables create/edit. The
  list exposes Start Date, End Date, Work Center, User, Loss Reason, Duration
  (minutes), and Company. The read-only form exposes Manufacturing Order, Work
  Order, Work Center, Loss Reason, Start Date, End Date, Duration, Company,
  and Description. Live demo data rendered Assembly 1 and Drill 1 with
  7,200 total productive minutes.
- Core3 implements the bounded report at `/manufacturing/oee` and its
  read-only detail at `/manufacturing/oee/detail`. Frontend pages
  `manufacturing-oee` and `manufacturing-oee-detail` remain presentation-only;
  `api/oee.yaml` and `api/oee-detail.yaml` own the report/detail queries and
  are joined by matching `page.id`. Migration `0.0.10` seeds six stable
  productivity rows dated from `2026-01-10` through `2026-01-13`, two work
  centers, productive/availability losses, manufacturing/work-order links,
  and the exact 7,200-minute aggregate. The report supports default grouped
  rows, search, work-center/loss/effectiveness filters, date range filtering,
  graph/pivot/list/form navigation, empty results, and explicit 401/403/503
  datasource errors; the detail supports 401/403/404/503 boundaries.
- Because Odoo sets `create:False,edit:False`, this slice intentionally adds no
  CRUD, workflow, or stale-write mutation. All report/detail datasources and
  navigation require `manufacturing.read`; the focused suite verifies the
  read-only permission boundary and no mutation actions are exposed.
- Authenticated paired viewport captures are under `/tmp` and are not
  committed. Odoo paths are
  `/tmp/odoo-manufacturing-oee-{desktop,mobile}-{graph,pivot,list,form}-final.png`;
  Core3 paths are
  `/tmp/core3-manufacturing-oee-{desktop,mobile}-{graph,pivot,list,detail}-final.png`.
  The browser matrix covered all four modes at 1440x900 and 390x844. Core3
  had no relevant failed requests or page errors and `scrollWidth` equaled
  the viewport width on every capture; Odoo had no page errors and also fit
  both viewports, with mobile-only aborted background mail/avatar requests
  during rapid view navigation.
- Known bounded visual limits: Odoo's official demo productivity timestamps
  are generated from the current date while Core3 is intentionally fixed for
  deterministic fixtures, so displayed dates differ. Odoo collapses grouped
  mobile list headers while the shared Core3 list keeps the report rows
  expanded. Core3 uses the shared responsive pivot/table renderer rather than
  Odoo's exact canvas/table chrome, and the read-only detail does not synthesize
  chatter or mutation controls that the live OEE form does not expose. No
  worksheet control was added because the installed OEE action exposes no
  worksheet field; separate Productivity Losses, Work Orders Performance,
  Unbuild, and other report actions remain outside this slice.

## 2026-09-11 bounded Operations follow-up

- Revalidated the live personal reference before implementation against
  `core3_personal` at `http://localhost:8069`: `mrp` is installed
  (`19.0.2.0`, demo enabled), `mrp.mrp_routing_action` is runtime action 855,
  `mrp.menu_mrp_routing_action` is runtime menu 554, and the model is
  `mrp.routing.workcenter`. The action exposes `list,kanban,form`; the
  authenticated action URL is `/odoo/action-855`. In this Odoo build the
  friendly `/odoo/operations` URL redirects to Discuss, so it is not used as
  screenshot evidence.
- The five live demo rows are represented in Core3 `/manufacturing/operations`
  with Odoo-visible Operation, Bill of Material, Work Center, Duration
  (minutes), Duration Computation, Default Duration, Cost based on, Company,
  active/archive, and dependency fields. The list and detail pages are
  presentation-only; `api/operations.yaml` and `api/operation-detail.yaml`
  own all queries and mutations and join the pages by `page.id`.
- Migration `0.0.9` seeds stable `2026-01-15` Operations fixtures. Focused
  coverage includes active/search/empty/not-found/transport-error states,
  create/edit, duplicate-name `409`, invalid-duration/mode `422`, stale-row
  `409`, missing `404`, archive/restore, and in-use delete `409` guards with
  explicit read/write/manage permissions.
- Authenticated paired captures were performed at 1440x900 and 390x844 using
  the live personal Odoo action and the isolated Core3 runtime. Odoo list,
  kanban, and populated form paths are `/tmp/odoo-manufacturing-operations-
  {desktop-1440x900,mobile-390x844}-{list,kanban,form}.png`; Core3 paths are
  `/tmp/core3-manufacturing-operations-
  {desktop-1440x900,mobile-390x844}-{list,kanban,form}.png`. The final rerun
  reported zero failed/4xx+ responses and no horizontal overflow on every
  surface. Images remain under `/tmp` and are not committed.
- Deliberate bounded limitations: the current live action has no worksheet
  field in its installed `mrp.routing.workcenter` form, so no synthetic
  worksheet control was added; inline dependency/variant relation editors,
  chatter data, cross-company record rules, and the separate OEE/Unbuild/report
  actions remain outside this slice. The full Manufacturing readiness gate
  remains open.

## 2026-09-11 bounded Work Centers follow-up

- Revalidated the installed Odoo contract against `core3_owned`: `mrp.mrp_workcenter_action` (runtime action 839), menu `mrp.menu_view_resource_search_mrp` (runtime menu 519), model `mrp.workcenter`, route `/odoo/workcenters`, and `list,kanban,form` modes. The list uses sequence/name/code/tags/alternatives/productive time/cost/hourly efficiency/OEE/setup/cleanup/company; the form uses `General Information` and `Product Capacities` notebook tabs plus the OEE/Lost/Load/Performance stat buttons and chatter.
- The isolated Manufacturing follow-up aligns Core3 `/work-centers` to that list/kanban contract, uses the shared responsive ListView behavior, and renders the populated OdooFormView with the matching field labels, two tabs, archive/restore/delete guards, deterministic `2026-01-15` fixtures, and explicit read/write/manage permissions. Backend SQL remains in page-id-bound API fragments; frontend pages remain presentation-only.
- Authenticated captures are under `/tmp`: Odoo desktop `/tmp/odoo-manufacturing-work-centers-desktop-{list,kanban,form}.png`, Odoo mobile `/tmp/odoo-manufacturing-work-centers-mobile-{list,form}.png`, and Core3 final desktop `/tmp/core3-manufacturing-work-centers-desktop-{list,form}.png`. The final Core3 mobile list/form pair was not refreshed after the row-navigation adjustment, and the shared renderer did not expose a Kanban switcher in the runtime control panel, so those are explicit evidence gaps rather than signoff claims. Browser runs used `domcontentloaded` plus fixed waits; no `networkidle` dependency was used.
- Deliberately deferred in this bounded slice: cross-module OEE/Load/Performance/Operations report targets, mail chatter data, and inline Product Capacities CRUD. No fake Manufacturing routes were added for those source actions.

## 2026-09-10 bounded implementation progress

- The owned authenticated reference database `core3_owned` has Manufacturing
  installed with demo data. The disjoint Configuration / Work Centers action
  (`mrp_workcenter_action`, action 872, model `mrp.workcenter`,
  `list,kanban,form`) is implemented in Core3 as `/work-centers` with a
  presentation-only list/detail pair, page-id-bound API fragments, fixed
  2026-01-15 fixtures, CRUD/archive permissions, and explicit empty/error/
  not-found/validation/conflict states.
- The Products / Bills of Materials action (`menu_mrp_bom_form_action`, menu
  574, `mrp_bom_form_action`, action 876, model `mrp.bom`) is implemented in
  Core3 as `/manufacturing/boms` with a page-only list/kanban layout and icon
  view controls, a page-only form detail route, page-id-bound API fragments,
  eight deterministic fixtures matching the installed Odoo rows, components/
  operations/by-products tabs, and CRUD/archive/restore/duplicate guards.
- The Operations / Manufacturing Orders action (`menu_mrp_production_action`,
  model `mrp.production`) is implemented in Core3 as `/manufacturing-orders`
  with page-only list/detail layouts, page-id-bound API fragments, deterministic
  six-state fixtures, work-order and stock-move detail rows, and permissioned
  Confirm → Start → Mark produced → Close / Cancel transitions. Focused tests
  cover discovery, search/filter/empty/error/detail fixtures, validation, stale
  writes, and invalid transitions. The authenticated browser matrix remains
  incomplete: Odoo desktop list/detail captures exist under `/tmp`, while Core3
  and mobile captures were not completed.
- The Operations / Work Orders action (`mrp_workorder_todo`, model
  `mrp.workorder`, `list,kanban,form,calendar,pivot,graph`) is implemented in
  Core3 as `/workorders` with a page-only six-mode list and a page-only
  Odoo-style detail form at `/workorders/detail`. Its API fragments are bound
  by `page.id`, migration `0.0.7` adds seven stable work-order fixtures across
  waiting, ready, progress, finished, blocked, and cancelled states, and the
  plan/start/pause/block/continue/cancel actions use permissioned state and
  row-version compare-and-swap guards. Empty, not-found, and transport-error
  states are declared and covered by a focused integration test. Browser
  comparison evidence for this slice is still pending.
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
  `core3_owned`, user `codex@core3.local`. Odoo server is `19.0-20260908` and
  `ir.module.module.search_read` returned `name=mrp`, `state=installed`,
  `latest_version=19.0.2.0`, `demo=true`. The menu resolves to action 876 and
  the rendered action URL is `/odoo/boms`; the desktop action exposes List and
  Kanban view switches and the form opens at `/odoo/boms/1`.
- Paired authenticated BOM evidence for this bounded slice is recorded below;
  all image files remain under `/tmp` and are intentionally not committed.

## Gate 1 - addon, manifest, version, and demo status

The source manifest is authoritative for addon scope. It loads security,
digest/mail subtype/template data, MRP base data, all listed view and wizard
XML, reports, and `mrp_demo.xml` only when the database is created with demo
data. The source demo file contains products/components, BOMs, work centers,
operations, manufacturing orders, stock moves/quantities, and transitions
used to make the operations screens non-empty. Do not copy transient source
dates or random database IDs; use stable Core3 fixtures described below.

The owned reference is installed with official demo data. Full manufacturing
readiness remains open because the other Manufacturing actions in this plan are
not yet implemented as paired slices.

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

Required capture matrix for the full module remains broader than this bounded
slice. The completed Bills of Materials pair is:

| Viewport | Required evidence |
| --- | --- |
| Desktop 1440x900 | Odoo action 876 list, kanban, and populated form; Core3 `/manufacturing/boms` list, kanban, and detail/form |
| Mobile 390x844 touch | Odoo action 876 list, kanban, and populated form; Core3 responsive list/kanban/detail/form with icon controls, quantity/UoM, references, and no horizontal overflow |

For every capture record Odoo action ID, resulting browser URL, model, view
mode, fixture/data state, viewport, and `/tmp` path. A screenshot from another
module, an uninstalled route, or synthetic HTML is not acceptable.

## Gate 4 - Core3 datasource, deterministic fixtures, and API contract

The existing service is `sdk/bun/sample/services/manufacturing`: manifest menu
entries for four routes, permissions `manufacturing.read/write/manage`, DuckDB
storage, migrations `0.0.1` through `0.0.5`, and pages for orders, detail, BOMs,
analysis, and a production workflow. The BOM page no longer embeds SQL; its
list/detail API fragments own the datasource queries and mutations.

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
