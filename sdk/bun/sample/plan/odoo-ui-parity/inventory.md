# Inventory UI parity

Status: in-progress

## 2026-09-20 Inventory Analysis contract repair

- Moved the Inventory Analysis datasource definitions out of the page YAML
  into `api/analysis.yaml`, joined by `page.id`, so the route now follows the
  YAML-first page/API ownership contract used by the rest of the module.
- Added declared read permission, forbidden/transport boundaries, and explicit
  empty-state handling for the totals and units-by-location queries. Focused
  coverage verifies discovery, deterministic data, and those failure states;
  the full Inventory browser comparison gate remains open.

## Reference gate

- Odoo addon: `stock` (Inventory), Odoo 19 Community source tree at
  `/home/nhanjs/projects/odoo`, branch `19.0`, source revision `65975996`.
- Source manifest: `/home/nhanjs/projects/odoo/addons/stock/__manifest__.py`.
  The addon is an application, depends on `product`,
  `barcodes_gs1_nomenclature`, and `digest`, and declares official demo files
  `stock_demo_pre.xml`, `stock_demo.xml`, `stock_demo2.xml`,
  `stock_orderpoint_demo.xml`, and `stock_storage_category_demo.xml`.
- Authenticated live audit on 2026-09-10: `http://localhost:8069`, database
  `core3_reference`, user `codex@core3.local`. `ir.module.module` reports `stock` as
  `installed`, `demo: true`, `latest_version: 19.0.1.1`; server version is
  `19.0-20260908`. The live database is therefore an installed, official-demo
  reference, not an unavailable/uninstalled fallback.
- The authenticated audit loaded the Inventory overview and every visible
  menu destination below with zero failed network requests. Do not replace
  these references with fabricated or unverified screenshots.

## Live screenshot evidence

Screenshots are outside Git under `/tmp/odoo-inventory/`. Desktop is 1440x900;
mobile is 390x844 with touch emulation. Each route was loaded after login and
the page title/body and failed-request list were checked before capture.

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Inventory Overview | `/tmp/odoo-inventory/overview-desktop.png` | `/tmp/odoo-inventory/overview-mobile.png` |
| Receipts | `/tmp/odoo-inventory/receipts-desktop.png` | `/tmp/odoo-inventory/receipts-mobile.png` |
| Deliveries | `/tmp/odoo-inventory/deliveries-desktop.png` | `/tmp/odoo-inventory/deliveries-mobile.png` |
| Physical Inventory | `/tmp/odoo-inventory/physical-inventory-desktop.png` | `/tmp/odoo-inventory/physical-inventory-mobile.png` |
| Scrap Orders | `/tmp/odoo-inventory/scrap-desktop.png` | `/tmp/odoo-inventory/scrap-mobile.png` |
| Replenishment | `/tmp/odoo-inventory/replenishment-desktop.png` | `/tmp/odoo-inventory/replenishment-mobile.png` |
| Products | `/tmp/odoo-inventory/products-desktop.png` | `/tmp/odoo-inventory/products-mobile.png` |
| Product Variants | `/tmp/odoo-inventory/product-variants-desktop.png` | `/tmp/odoo-inventory/product-variants-mobile.png` |
| Lots / Serial Numbers | `/tmp/odoo-inventory/lots-desktop.png` | `/tmp/odoo-inventory/lots-mobile.png` |
| Stock report | `/tmp/odoo-inventory/stock-report-desktop.png` | `/tmp/odoo-inventory/stock-report-mobile.png` |
| Moves History | `/tmp/odoo-inventory/moves-history-desktop.png` | `/tmp/odoo-inventory/moves-history-mobile.png` |
| Moves Analysis | `/tmp/odoo-inventory/moves-analysis-desktop.png` | `/tmp/odoo-inventory/moves-analysis-mobile.png` |
| Settings | `/tmp/odoo-inventory/settings-desktop.png` | `/tmp/odoo-inventory/settings-mobile.png` |
| Warehouses | `/tmp/odoo-inventory/warehouses-desktop.png` | `/tmp/odoo-inventory/warehouses-mobile.png` |
| Operations Types | `/tmp/odoo-inventory/operation-types-desktop.png` | `/tmp/odoo-inventory/operation-types-mobile.png` |
| Categories | `/tmp/odoo-inventory/categories-desktop.png` | `/tmp/odoo-inventory/categories-mobile.png` |
| Attributes | `/tmp/odoo-inventory/attributes-desktop.png` | `/tmp/odoo-inventory/attributes-mobile.png` |

The mobile captures for menu destinations may include Odoo's `?view_type=kanban`
selection because the responsive client chooses kanban; that is an observed
state and must be covered, not normalized away.

## Visible menu and source action inventory

The following is the authenticated admin-visible Inventory navigation, joined
to source XML IDs and live client routes. Group-restricted entries must be
tested with the corresponding ordinary user, multi-location/tracking user,
and stock manager rather than assumed visible for every role.

| Menu group | Menu item | Source XML ID / action | Live route | Source view modes |
| --- | --- | --- | --- | --- |
| Overview | Overview | `stock.stock_picking_type_menu` / `stock_picking_type_action` | `/odoo/inventory` | `kanban,form` |
| Operations | Receipts | `stock.in_picking` / `action_picking_tree_incoming` | `/odoo/receipts` (live action alias was `/odoo/action-412`) | `list,kanban,form,calendar,activity` |
| Operations | Deliveries | `stock.out_picking` / `action_picking_tree_outgoing` | `/odoo/deliveries` (live action alias `/odoo/action-413`) | `list,kanban,form,calendar,activity` |
| Operations | Physical Inventory | `stock.menu_action_inventory_tree` / `action_view_inventory_tree` | `/odoo/physical-inventory` | editable `list,form` plus adjustment wizard |
| Operations | Scrap | `stock.menu_stock_scrap` / `action_stock_scrap` | `/odoo/scraps` | `list,form,kanban,pivot,graph` |
| Operations | Replenishment | `stock.menu_reordering_rules_replenish` / `action_orderpoint_replenish` | `/odoo/replenishment` | `list,kanban,form` |
| Products | Products | `stock.menu_product_variant_config_stock` / `product_template_action_product` | `/odoo/action-433` | `kanban,list,form` |
| Products | Product Variants | `stock.product_product_menu` / `stock_product_normal_action` | `/odoo/action-434` | `list,form,kanban` |
| Products | Lots / Serial Numbers | `stock.menu_action_production_lot_form` / `action_production_lot_form` | `/odoo/lots` | list/form, grouped by location |
| Reporting | Stock | `stock.menu_product_stock` / `action_product_stock_view` | `/odoo/stock-report` | `list,form` plus Inventory at Date |
| Reporting | Moves History | `stock.stock_move_line_menu` / `stock_move_line_action` | `/odoo/moves-history` | `list,kanban,pivot,form` |
| Reporting | Moves Analysis | `stock.stock_move_menu` / `stock_move_action` | `/odoo/moves-analysis` | list/pivot/graph/kanban/form action views |
| Configuration | Settings | `stock.menu_stock_general_settings` / `action_stock_config_settings` | `/odoo/action-445` | `form` |
| Configuration | Warehouses | `stock.menu_action_warehouse_form` / `action_warehouse_form` | `/odoo/action-397` | list/form |
| Configuration | Operations Types | `stock.menu_pickingtype` / `action_picking_type_list` | `/odoo/action-426` | `list,form` |
| Configuration > Products | Categories | `stock.menu_product_category_config_stock` / `product.product_category_action_form` | `/odoo/product-categories` | list/form/kanban from product addon |
| Configuration > Products | Attributes | `stock.menu_attribute_action` / `product.attribute_action` | `/odoo/attributes` | list/form from product addon |

Source menus also define or expose these linked, role/feature-gated actions:
Transfers (all, internal), Adjustments (Physical Inventory, Scrap),
Procurement (Replenishment, Reordering Rules), warehouse management (Locations,
Operations Types, Routes, Putaway Rules, Storage Categories, Package Types),
Products (Stock, Product Variants, Units & Packagings, Categories, Attributes,
Packages, Lots), and reporting (Inventory/Stock, Moves History, Moves
Analysis). Preserve the distinction between visible menu entries and linked
stat buttons/wizards. Hidden technical barcode nomenclature is
`base.group_no_one` and is not an ordinary-user parity target.

## View, record, and interaction states

- Overview: kanban operation cards, Receipts/Deliveries/PoS order counters,
  late/waiting/ready cards, company switcher, pager, activity indicators, and
  empty/loading/error states.
- Transfers: Receipts, Deliveries, Internal Transfers, All Transfers, To Do,
  Waiting, Late, Backorders, Ready Moves, and Operations; list, kanban, form,
  calendar, and activity states; create/edit/read-only; draft, waiting,
  assigned, done, cancelled, backorder, lock/unlock, reserve/unreserve,
  validate, return, scrap, put in pack, labels, send email, and chatter.
- Inventory: editable on-hand list, set quantity, set zero, relocate,
  inventory adjustment name/conflict/warning dialogs, Inventory at Date, and
  product/location drilldowns.
- Products and stock: product kanban/list/form, variants, categories,
  attributes, packaging, lots/serials, packages, forecasted report, and
  replenish dialog, including archived, tracked, storable, multi-company,
  no-result, access-denied, and empty states.
- Replenishment: reordering rules and replenishment list/kanban/form, trigger
  filters (automatic/manual), snooze, forecast quantities, vendor/orderpoint
  fields, and replenishment information/warning dialogs.
- Scrap: list/kanban/form/pivot/graph, create/edit, source/destination
  locations, product/lot/package, quantity validation, confirm/done/cancelled,
  and insufficient-quantity warning.
- Reporting: stock list with category/product filters and Inventory at Date;
  Moves History done filter with list/kanban/pivot/form; Moves Analysis with
  list/pivot/graph/kanban and group-by/measure states; traceability and PDF
  report error/download states.
- Settings: system settings form with inventory operation, warehouse,
  barcode, lots/serials, packages, routes, lead times, warnings, and optional
  module controls; full-width Odoo settings layout.
- Common controls: search, filters, group-by, optional columns, bulk actions,
  pagination, row open, breadcrumbs, action menus, status chips, many2one and
  one2many fields, date/context filters, company scope, access-denied,
  loading, server error, and no-data states. Mobile must use usable menus and
  forms with no horizontal page overflow.

## Existing Core3 surface and parity gap

The `services/inventory` service currently contains `manifest.yaml`, storage and
permissions, two migrations, `styles/index.scss`, and these convention-
discovered pages:

- `stock` (`/stock`): On Hand `ListView` over `inventory_quants`;
- `moves` (`/moves`): Stock Moves list, state filter, create/validate/cancel
  mutations, and stock summary;
- `warehouses` (`/warehouses`): warehouse list and manager-only create;
- `locations` (`/locations`): location list and manager-only create; and
- `inventory-analysis` (`/inventory-analysis`): four stats and units-by-
  location bar chart.

The foundation schema only models warehouses, locations, quants, and simple
moves, with one pallet demo quant. It lacks pickings/operation types, move
lines, products/variants/UoM, lots/serials, packages, reservations, orderpoints,
routes/rules, scrap, valuation, replenishment, companies, activities/chatter,
settings, attachments, reports, linked dialogs, and the Odoo workflow/role
boundaries. Page YAML currently owns SQL; new backend datasource/action
definitions should move to convention-discovered `services/inventory/api/`
fragments keyed by `page.id`, while frontend page YAML remains declarative.

## Required shared primitives

Reuse and extend generic contracts before adding Inventory-specific code:

- Odoo `ListView`, `Kanban`, `FormView`/`OdooFormView`, `Calendar`, `Activity`,
  `Pivot`, `Chart`, `StatRow`, `StatusBar`, `StatusChip`, pager, optional
  columns, bulk selection, search/filter/group-by, and responsive card/list
  modes;
- server-form/action mutation contracts with guards, optimistic refresh,
  stable errors, permission-aware buttons, async many2one/one2many fields,
  dialogs/modals, date/context filters, company switcher, and attachment/
  chatter/activity panels;
- inventory-generic quantity editor, reservation/availability indicator,
  lot/serial selector, package/location selector, barcode input, forecast
  panel, replenishment warning, return/backorder, scrap, put-in-pack, physical
  inventory adjustment, and PDF/report result contracts. If absent, add the
  generic primitive/API contract to the implementation plan first; do not
  create a page-specific renderer;
- `SettingsView` with Odoo full-width layout and content-only scrolling;
  shared i18n, loading, empty, error, access-denied, responsive overflow, and
  mobile action-menu primitives.

## Deterministic service-owned datasource/API contract

All pages and view states must use service-owned datasource/API fragments. No
page-local records, random IDs, `CURRENT_DATE`, browser fixtures, remote images,
or live Odoo calls are allowed. Add idempotent migrations and prove fresh
install plus upgrade behavior for DuckDB and supported adapters.

The fixture provider must include stable IDs and seeded date `2026-01-15`, with:

- at least one company and warehouse, multiple active/archived locations,
  internal/customer/supplier/transit/loss usages, and ordinary, manager,
  multi-location, lot-tracking, and denied users;
- storable goods and consumables, variants, UoMs, categories, packages,
  lots/serials, products with zero/on-hand/reserved/forecast quantities,
  negative/insufficient and multi-company cases;
- receipts, deliveries, internal transfers, draft/waiting/assigned/done/
  cancelled/backorder pickings, move lines, operations, packages, returns,
  scraps, inventory adjustments, and chatter/activity records;
- automatic/manual orderpoints, routes, push/pull rules, vendors, lead times,
  snoozed and warning replenishment cases; and
- stable datasets for every named filter/group/measure, a deliberately empty
  result for every list and analysis route, deterministic pagination/order, and
  explicit 401/403/404/409/422 responses for read, write, manager, tracking,
  settings, and report permissions.

Mutation APIs must cover create/edit, reserve/unreserve, validate/cancel,
backorder/return, set quantity/zero, relocate, scrap, put in pack, replenish,
snooze, lot assignment, and settings updates. Guards must enforce source and
destination differences, available stock, tracked-lot requirements, state
transitions, company scope, row versions, and stable conflict messages.

## Source-defined routes

Odoo web-client action routes are generated aliases, not Python HTTP endpoints;
the observed authenticated paths are listed in the menu table. The stock addon
also defines the authenticated controller route
`/stock/<output_format>/<report_name>` in
`addons/stock/controllers/main.py`, currently used for PDF traceability with
`active_id`, `active_model`, `data`, and optional JSON context. Core3 must model
the report request as a permission-checked service action and must not expose a
raw arbitrary report path. Preserve explicit Core3 routes `/stock`, `/moves`,
`/warehouses`, `/locations`, and `/inventory-analysis`, adding aliases only for
compatibility; add explicit routes for the parity surfaces above.

## Bounded batch: receipts and deliveries transfers (2026-09-10)

This batch implements the next bounded transfer slice only. It follows the
Odoo 19 `action_picking_tree_incoming` and `action_picking_tree_outgoing`
orders: `list`, `kanban`, `form`, `calendar`, `activity`, with Receipts before
Deliveries under the Transfers menu group. Core3 keeps its existing route
aliases (`/receipts`, `/deliveries`, and `/inventory/transfer/detail`) because
the shell qualifies service routes; the visible labels and breadcrumb order
match the Odoo action/menu labels. The Inventory overview remains the existing
`/stock` alias and is not claimed as complete in this batch.

The list pages are layout-only YAML. `pages/receipts.yaml` and
`pages/deliveries.yaml` bind to `api/transfers.yaml` and
`api/deliveries.yaml`; the shared detail layout is `pages/transfer-detail.yaml`
with page id `transfer-detail`, owned by `api/transfer-detail.yaml`. That
page-id alignment fixes side-panel requests that previously addressed the
filename `transfer-detail` while the API page id was `inventory-transfer-detail`.

The `0.0.4` Inventory migration adds stable move-line and transfer-history
fixtures for receipts and deliveries. List and detail sources expose
deterministic empty/not-found predicates and `503`
`INVENTORY_TRANSFER_DATA_UNAVAILABLE` transport states. Detail actions enforce
`inventory.write`, row-version guards, and the Odoo-style Draft → Waiting →
Ready → Done / Cancelled transitions. The detail includes Operations,
Additional Info, Note, move lines, Send message, and Log note. Move-line CRUD,
lot/package/reservation details, Print, Return, and the mobile action menu are
intentionally deferred rather than represented by placeholder controls.

Focused evidence:

- `bun test test/inventory_transfer_workflow.integration.test.ts`: 3 tests,
  41 assertions passed; `git diff --check` passed.
- Authenticated Core3 desktop captures (1440x900):
  `/tmp/core3-inventory-batch-desktop-receipts-list-final.png`,
  `/tmp/core3-inventory-batch-desktop-receipts-detail-final.png`.
- Authenticated Core3 mobile captures (390x844):
  `/tmp/core3-inventory-batch-mobile-deliveries-list-final.png`,
  `/tmp/core3-inventory-batch-mobile-deliveries-detail-final.png`.
- Authenticated personal Odoo 19 comparison captures:
  `/tmp/odoo-inventory-batch-desktop-receipts-list.png`,
  `/tmp/odoo-inventory-batch-desktop-receipts-detail.png`,
  `/tmp/odoo-inventory-batch-desktop-deliveries-detail.png`,
  `/tmp/odoo-inventory-batch-mobile-deliveries-list.png`.
- Core3 browser checks used `admin@tms.local` on the isolated runtime at
  `http://127.0.0.1:3090`; the list/detail routes loaded with no responses at
  or above HTTP 400. The final mobile delivery list has
  `scrollWidth === clientWidth === 390`, after removing the grouped kanban
  overflow found during comparison. The reference session used
  `codex@core3.local` in `core3_reference` at `http://127.0.0.1:8069`.

## Bounded batch: Physical Inventory (2026-09-10)

The authenticated `core3_owned` Odoo 19 reference was refreshed after the
installed-module restart before this batch. The exact observed module/action
state is:

- `stock` is `installed`, with demo data enabled, version `19.0.1.1`.
- XMLID `stock.action_view_inventory_tree` resolves to `ir.actions.server`
  id `519`, named `Inventory`, path `physical-inventory`, model `Quants`.
- XMLID `stock.menu_action_inventory_tree` resolves to `ir.ui.menu` id `331`.
- The action is list-only. Its visible action surface is `Physical Inventory`
  under Operations, with `New`, `Apply All`, row `History`, and the editable
  Product, Lot/Serial Number, Scheduled, User, On Hand, Counted, Difference,
  and Unit columns. Odoo's manager-only row actions `Set to 0` and `Clear`
  are permissioned as `inventory.manage` in Core3; `Set to On Hand`, `Apply`,
  and `Apply All` use `inventory.write`.
- No kanban, calendar, or other Physical Inventory view was exposed by this
  source action, so Core3 does not invent tabs for this list-only route. The
  existing shell's visible text menu labels and the list's visible filter
  labels are retained.

Core3 keeps the service-owned page/API split joined by `page.id`:
`pages/physical-inventory.yaml` (`physical-inventory`) binds to
`api/physical-inventory.yaml` (`physical-inventory`). Migration `0.0.5`
adds stable internal/transit physical-inventory quantities, lot values,
counted states, fixed `2026-01-15` dates, and deterministic ordering. The
route includes search, My Counts/location/count-state filters, grouping,
empty and transport-error states, create/apply-all dialogs, row-version
guards, and permission-aware row actions. The `Physical Inventory` manifest
menu requires `inventory.read`.

Focused evidence:

- `bun run --cwd packages/client test -- test/cases/list-view.test.ts
  test/cases/page-renderer-list-view.test.ts`: 44 tests passed, including
  permitted header-action rendering, single-instance protection, and server
  action dispatch; `bun test test/inventory_physical_inventory.integration.test.ts`:
  3 tests and 22 assertions passed.
- `bun run css:build:inventory`, `git diff --check`, and the Inventory audit
  passed. The authenticated Core3 runtime used `admin@tms.local` at
  `http://127.0.0.1:3090`; desktop and mobile both had no failed responses,
  one `Apply All` header action, one Physical Inventory menu leaf, and no
  duplicate header actions.
- Core3 desktop (1440x900):
  `/tmp/core3-inventory-next-physical-desktop.png`;
  Core3 mobile (390x844):
  `/tmp/core3-inventory-next-physical-mobile.png`. Both had document/body
  `scrollWidth === clientWidth` (1440/1440 and 390/390).
- Refreshed authenticated Odoo captures used `codex@core3.local` in
  `core3_owned` at `http://localhost:8069`. Desktop:
  `/tmp/odoo-inventory-next-owned-physical-desktop.png` with document/body
  1440/1440 and table 1440/1440. Mobile:
  `/tmp/odoo-inventory-next-owned-physical-mobile.png` with document/body
  390/390; the table is intentionally 888/390 and clipped inside
  `.o_list_renderer.table-responsive` with `overflow-x: auto`. No failed
  requests occurred after navigating to the ready list in either capture.

The list-only source action's absent tabs and deferred Odoo-side actions such
as Relocate, Request a Count, and report/export flows remain documented
limitations rather than invented routes or controls.

## Bounded batch: Lots / Serial Numbers (2026-09-10)

The owned `core3_owned` Odoo 19 reference was authenticated as
`codex@core3.local` at `http://localhost:8069` before finalizing this slice.
The source action is `stock.action_production_lot_form` at `/odoo/lots`, with
list, kanban, and form views, default grouping by location, and search/filter
contracts for lot/reference/product, At Customer, and On Hand.

Core3 adds the `/inventory/lots` and `/inventory/lots/detail` routes. The
presentation-only pages are `pages/lots.yaml` (`lots`) and
`pages/lot-detail.yaml` (`lot-detail`), bound by `page.id` to
`api/lots.yaml` and `api/lot-detail.yaml`. Migration `0.0.8` adds the
service-owned `inventory_lots` table and stable lot/serial fixtures dated
`2026-01-15`, including on-hand, customer, empty, serial, and moved-product
cases. List/detail sources provide deterministic search, availability filters,
empty/not-found results, and explicit 503 transport errors. Manage actions
enforce duplicate, quantity, location, moved-product, safe-delete, and row
version guards.

Focused evidence:

- `bun test test/inventory_lots.integration.test.ts`: 3 tests, 46 assertions passed.
- `git diff --check`: passed before commit.
- Odoo authenticated JSON-RPC evidence: `/tmp/core3-owned-auth.json`,
  `/tmp/core3-owned-lot-fields.json`, and `/tmp/core3-owned-lot-data.json`.
- Fresh authenticated paired list captures were completed at 1440x900 and
  390x844: Core3 `/tmp/core3-inventory-lots-desktop.png` and
  `/tmp/core3-inventory-lots-mobile.png`, Odoo
  `/tmp/odoo-inventory-lots-odoo-desktop.png` and
  `/tmp/odoo-inventory-lots-odoo-mobile.png`. Both surfaces reported zero
  failed responses and equal document/body widths to their viewport. Visual
  comparison found Core3 was opening the first record in a desktop side
  panel; `form_view.side_panel` is now false so the initial list matches
  Odoo, with row selection still opening the detail route. Screenshots remain
  under `/tmp` and are not included in Git.

Known limitations are unchanged from this bounded action: product and partner
relations are deterministic text contracts, and traceability/report,
activities/chatter, properties, and full Odoo many2one behavior remain future
parity work.

## Bounded batch: Warehouses configuration (2026-09-10)

The owned Odoo 19 reference was reachable at `http://localhost:8069` and was
authenticated as `codex@core3.local` in `core3_owned`. Source XML
`stock.action_warehouse_form` (`stock/views/stock_warehouse_views.xml`) is a
list/form action with an Archived search filter. The live `stock.warehouse`
record exposes Warehouse, Short Name, Company, Address, Incoming Shipments,
and Outgoing Shipments; the model constrains the short name to five characters
and enforces unique name/code per company. The generated live action URL was
`/odoo/action-397`; Core3 keeps its explicit service route and shell alias
`/inventory/warehouses` (`/warehouses` in the manifest) rather than treating
the generated Odoo action alias as an HTTP endpoint.

Core3 now keeps the presentation pages layout-only:
`pages/warehouses.yaml` (`warehouses`) and
`pages/warehouse-detail.yaml` (`warehouse-detail`) bind by matching
`page.id` to `api/warehouses.yaml` and `api/warehouse-detail.yaml`. The list
supports active/archived/all status filtering, search, row-open detail
navigation, empty state, and transport-error state. The detail supports the
Odoo field/state slice and manager-only create, edit, archive, restore, and
delete actions. Migration `0.0.9` adds deterministic company and shipment-flow
fields, initializes stable `2026-01-15` fixture behavior through the existing
seed rows, and marks the overflow warehouse archived. Guards cover required
name, five-character code, duplicate code, valid shipment flows, stale row
versions, open operations, and warehouses that still own locations.

Focused evidence:

- `bun test test/inventory_warehouses.integration.test.ts`: 3 tests, 48
  assertions passed.
- The test reruns the Inventory migrations against DuckDB, checks deterministic
  active/archived fixture ordering, and exercises read, empty, 503, 404, 409,
  422, CRUD, lifecycle, permission, and concurrency contracts.
- The authenticated Odoo comparison used JSON-RPC evidence in
  `/tmp/core3-odoo-warehouse-auth.json` and
  `/tmp/core3-odoo-warehouse-data.json`; no screenshots were added to Git.
  Browser navigation evidence was not run in this batch per the execution
  instruction to proceed without waiting for browser tooling, so authenticated
  Core3 visual/mobile parity remains an explicit limitation.

## Acceptance

- The implementation maps every admin-visible menu/action in the table to a
  Core3 route or a documented deliberate redirect. It separately documents
  role/feature-gated linked actions and keeps the technical barcode menu hidden.
- Authenticated Playwright navigation starts from the Core3 Inventory menu and
  covers every Core3 route at 1440x900 and 390x844, including the observed
  mobile kanban query state; direct URL checks alone do not sign off navigation.
- Reference comparison uses the captured `/tmp/odoo-inventory/*` files above;
  new captures are required if the live addon, database, user role, or source
  version changes. Assert titles, visible menus/records, no failed requests,
  no horizontal overflow, and usable mobile forms/actions.
- Functional checks cover every list/form/kanban/calendar/activity/pivot/graph/
  settings state, search/filter/group-by/optional columns/bulk/pagination/row
  open, empty/loading/error/denied states, dialogs, reports, and linked
  drilldowns. Assert the visible field/action contract against source XML.
- Workflow checks cover receipt/delivery/internal state transitions, reserve,
  validate, cancel, backorder, return, scrap, put in pack, adjustment,
  relocation, replenishment, lot/serial rules, and permission/company/row-
  version boundaries.
- Datasource checks prove service ownership, stable seeded ordering and IDs,
  deterministic totals, no page-local hard-coded records or remote assets,
  idempotent migration/upgrade, and every documented error response.
- Run focused YAML parsing/schema checks for all inventory YAML, markdown link
  and table checks for this file, the relevant Core3 audit/tests, authenticated
  browser smoke, and `git diff --check`. Screenshots remain under `/tmp`; the
  implementation commit may contain only YAML/TS/docs needed for the batch.

## Bounded batch: Reporting > Moves History (2026-09-11)

The live `core3_owned` Odoo 19 reference was rechecked at
`http://localhost:8069` as `codex@core3.local`. JSON-RPC action 455 confirms
`Moves History`, model `stock.move.line`, path `moves-history`, view order
`list,kanban,pivot,form`, default `Done` filter, and `create: 0`. The source
view also confirms the read-only list fields, To Do/Done plus incoming,
outgoing, internal filters, date filter, location/product/transfer/reference/
lot/package search fields, six group-by choices, mobile kanban, and the
read-only form field groups.

Core3 replaces the old page-local `inventory_moves` workflow list at `/moves`
with the service-owned move-line report. `pages/moves.yaml` is layout-only and
binds by page id to `api/moves.yaml`; the row-open form is separately declared
as `pages/move-line-detail.yaml` and `api/move-line-detail.yaml`. Migration
`0.0.10` adds 16 stable move-line fixtures dated around `2026-01-15`, covering
done, assigned, waiting, cancelled, incoming, outgoing, internal,
lot/package, inventory adjustment, search, and deterministic pivot totals.
The desktop default is List; mobile excludes List and defaults to Kanban to
match Odoo's responsive action; Pivot and read-only Form are available from
the same action. No create, edit, delete, stale-write, or workflow mutation
actions are exposed; all sources/actions require `inventory.read`.

Focused evidence:

- `bun test test/inventory_moves_history.integration.test.ts`: 3 tests,
  42 assertions passed. The suite proves matching page/API ids and routes,
  idempotent migration, stable ordering, Done/To Do/search/operation/date
  filters, empty and 503 states, pivot aggregation, detail/not-found, and
  explicit read-only CRUD/stale boundaries.
- Authenticated Core3 shell-Playwright captures (1440x900 and 390x844):
  `/tmp/core3-owned-moves-history-desktop-20260911.png` and
  `/tmp/core3-owned-moves-history-mobile-20260911.png`. Both had zero failed
  requests/page errors and document/body width 1440/1440 and 390/390.
- Authenticated Odoo shell-Playwright captures (1440x900 and 390x844):
  `/tmp/core3-owned-odoo-moves-history-desktop-20260911.png` and
  `/tmp/core3-owned-odoo-moves-history-mobile-20260911.png`. Both rendered
  the expected list/kanban action at document/body width 1440/1440 and
  390/390. The capture logged two `net::ERR_ABORTED` asset requests for
  Odoo's web JS/print CSS during navigation; no HTTP error response or route
  data failure occurred, and the screenshots are usable. This is the only
  deliberate browser-evidence limitation for this batch.
- Authenticated Core3 smoke also loaded `/moves?view=pivot` with a pivot
  table and `/moves/detail?id=move-line-0002` with a read-only form; both had
  no HTTP errors. Screenshots remain under `/tmp` and are not committed.

## Bounded batch: Procurement > Replenishment (2026-09-11)

Implementation commit: `edc9e84a` (`feat(inventory): add replenishment parity
slice`). This batch owns the previously uncovered Inventory procurement action
and does not duplicate Locations, Warehouses, Lots / Serial Numbers, Transfers,
Physical Inventory, or Moves History.

The authenticated Odoo 19 reference was compared at
`http://localhost:8069/odoo/replenishment` as `codex@core3.local`. The source
mapping is `stock.action_orderpoint_replenish` / the replenishment server
action in `addons/stock/views/stock_orderpoint_views.xml`, with menu
`stock.menu_reordering_rules_replenish` under Inventory > Configuration >
Reordering Rules. Odoo exposes the manager-only list and responsive kanban
action, defaulting to Manual + To Reorder + Not Snoozed and a 365-day horizon.
The visible list fields are Product, On Hand, Forecast, Route, Min, Max, To
Order, and Unit; row actions are Order, Automate, and Snooze.

Core3 keeps presentation and behavior separate. The manifest owns the
manager-only `Procurement > Replenishment` menu; the layout-only page is
`services/inventory/pages/replenishment.yaml` (`page.id: replenishment`) and
the matching page-owned API/action fragment is
`services/inventory/api/replenishment.yaml`. The configured service route is
`/replenishment`, rendered in the authenticated shell at
`http://localhost:3005/inventory/replenishment`. List, mobile kanban, and
create-form layouts are declarative; search, trigger/category/status/snooze
filters, grouping, empty/error states, and Order/Automate/Snooze/Create
actions are service-owned.

Migration `20260911120000-011-inventory-replenishment.yaml` (version `0.0.11`)
creates `inventory_orderpoints` and four stable orderpoint fixtures. Three
manual Furniture / Office rules reproduce the reference To Reorder rows
(`FURN_8900`, `E-COM06`, `FURN_1118`); one automatic Office Supplies rule covers
the trigger filter without changing the default result. The API supports
deterministic search/category/trigger/status/snooze/horizon filtering,
`fixture=empty|no_results|not_found`, and manager permission plus 403/503
transport contracts. Mutations guard required/range/duplicate input and stale
row versions; Order marks a rule Ordered with a deterministic `PO/REPL/<id>`
reference, Automate changes Manual to Automatic, and Snooze requires a future
date.

Focused evidence:

- `bun test ./test/inventory_replenishment.integration.test.ts`: 3 tests,
  31 assertions passed. The suite covers page/API/menu ownership, responsive
  view modes, deterministic fixtures, default/automatic/category/search/
  horizon/empty/unavailable states, permission and validation boundaries,
  row-version guards, and create/order/automate/snooze mutations.
- `bun run audit`: passed — 468 pages, 475 routes, 816 datasources; all
  discovered pages use supported shared components and have routes.
- `bun run lint`: passed. `bun run css:build:global`,
  `bun run css:build:auth`, and `bun run css:build:inventory` passed for the
  fresh-worktree browser run. `git diff --check` passed.
- Authenticated Odoo shell captures, inspected at the requested viewport
  sizes: desktop `/tmp/odoo-inventory-replenishment-desktop-20260911.png`
  (1440x900, SHA-256
  `a2f8181d0bdfa30a0b3fe5470e79207e5bd84752eee96152b1696cb56f63973c`) and
  mobile `/tmp/odoo-inventory-replenishment-mobile-20260911.png` (390x844,
  SHA-256
  `3d3dbf91dcde2601acfa850dd007b666a6e4e16a4450d72d7695ac656e9add56`).
- Authenticated Core3 shell captures, inspected at the requested viewport
  sizes: desktop `/tmp/core3-inventory-replenishment-desktop-20260911.png`
  (1440x900, SHA-256
  `a3dab7bb383a5f1f9fa91dcf9945b599d7dd234176f8f50320134fe97263f475`) and
  mobile `/tmp/core3-inventory-replenishment-mobile-20260911.png` (390x844,
  SHA-256
  `8b3eacab98fd7216f1dd117be9d804e6d44fa9a52c4ad5d5f8514ba971bad3e8`).
  Core3 rendered 3 desktop rows and 3 mobile cards; document width/scroll
  width was 1440/1440 and 390/390 respectively. The capture logged zero
  failed requests, HTTP errors, or page errors. Screenshots remain under
  `/tmp` and are not in Git.

Visual comparison and residual mismatches:

- Desktop parity is bounded to the same replenishment table, default filters,
  pagination, product quantities, route, and New entry point. Odoo uses its
  purple Inventory shell, left Trigger / Category / Horizon search panel, and
  inline Order / Automate / Snooze links. Core3 uses the shared Fluent shell,
  breadcrumb, filter chips, and a full-width table; the captured row action
  currently exposes Order, while Automate and Snooze remain declared and
  covered by the API/action contract but need shared row-action rendering to
  become visible parity.
- Mobile parity has the same responsive card mode, three seeded products,
  Manual and To Reorder state, and Replenishment Report cards. Odoo shows
  purple mobile chrome, Manual / Category controls, and inline min/max values;
  Core3 shows the shared shell, filter chips, and stacked Min qty / Max qty
  values. The Core3 Category control and Odoo's numeric Horizon 365 control are
  not yet visible in the mobile/desktop shell respectively.
- This slice intentionally stops short of Odoo's real purchase-order
  generation, supplier/product relational widgets, route icons, chatter,
  native snooze-date behavior, and full orderpoint drill-down. Core3's Order
  mutation is a deterministic state/reference contract; these are residual
  follow-up parity items, not claims of complete replenishment parity.

Evidence/docs commit is the commit immediately following implementation
commit `edc9e84a`; implementation code and tests remain separate.

## Bounded batch: Inventory view navigation tabs (2026-09-11)

This navigation-fidelity batch uses the fresh authenticated Odoo 19 reference
database `core3_codex_demo` at `http://localhost:8069` as
`codex@core3.local`. Before the Core3 change, JSON-RPC confirmed that
`stock.stock_move_line_action` is action `579` (`stock.move.line`,
`list,kanban,pivot,form`, default Done filter, `create: 0`) and that
`stock.menu_reordering_rules_replenish` invokes server action `622`, which
opens `action_orderpoint_replenish` action `620` (`stock.warehouse.orderpoint`,
`list,kanban,form`) with manual and non-snoozed reorder context. The live
reference contained 102 move lines (76 Done rows) and four replenishment rules.

Implementation commit: `a92285f5` (`fix(inventory): use visible tabs for
reports`). It changes the only two remaining explicit Inventory
`ListView.view_navigation: icons` declarations in `pages/moves.yaml` and
`pages/replenishment.yaml` to `tabs`, and adds only the corresponding matching
contract assertions in `inventory_moves_history.integration.test.ts` and
`inventory_replenishment.integration.test.ts`. No API YAML, Accounting file,
or Manufacturing file was changed; the existing page/API `page.id` split is
preserved. `rg` confirms no `view_navigation: icons` remains under
`services/inventory`.

Authenticated Odoo captures, loaded from the action routes and inspected:

- Moves History: `/odoo/action-579` resolved to `/odoo/moves-history`; desktop
  `/tmp/odoo-codex-inventory-moves-history-desktop-1440x900-final-20260911.png`
  (1440x900, SHA-256
  `00531546f1d348e03421ac762b85a1571ee90e32c8c7f936a22a75c566e3b6a0`) and
  mobile `/tmp/odoo-codex-inventory-moves-history-mobile-390x844-final-20260911.png`
  (390x844, SHA-256
  `1f30cf228220308505e9a6c50fd13e98d8116df1049a6132d5508e37d42ae300`).
- Replenishment: `/odoo/action-620`; desktop
  `/tmp/odoo-codex-inventory-replenishment-desktop-1440x900-final-20260911.png`
  (1440x900, SHA-256
  `e80b68bdfac854341d209e992a4bd543723b5810b964cc32eb5dc758318e34cf`) and
  mobile `/tmp/odoo-codex-inventory-replenishment-mobile-390x844-final-20260911.png`
  (390x844, SHA-256
  `33fcf6bfdd43166d6499f9adbb56f8e1d9f54805ceacaa99708302b47be5954a`).

Authenticated Core3 captures used `admin@tms.local / admin123` on the isolated
runtime (`backend: 3238`, Vite frontend: 3004) and were inspected:

- Moves History contract route `/moves` rendered at
  `/inventory/moves`; desktop
  `/tmp/core3-inventory-navigation-tabs-moves-history-desktop-1440x900-20260911.png`
  (1440x900, SHA-256
  `6a6cce0f8084ae0410bd10197c1540d04a37d70b427499bbb57e995bd566ca5f`) and
  mobile
  `/tmp/core3-inventory-navigation-tabs-moves-history-mobile-390x844-20260911.png`
  (390x844, SHA-256
  `1607d328e028da3211d85ae610349228282a9838aee68db0b7c4576e68d7cc66`).
  The default Done report rendered 10 seeded rows; desktop visibly showed
  `List` and `Pivot` text tabs, and mobile rendered the populated Kanban card
  mode.
- Replenishment contract route `/replenishment` rendered at
  `/inventory/replenishment`; desktop
  `/tmp/core3-inventory-navigation-tabs-replenishment-desktop-1440x900-20260911.png`
  (1440x900, SHA-256
  `2002faec318db62804af3df161a3828591af6bdb22ca016e978d15ee01028c02`) and
  mobile
  `/tmp/core3-inventory-navigation-tabs-replenishment-mobile-390x844-20260911.png`
  (390x844, SHA-256
  `c2150571801d91c490ebeb15ffbb4af5dc7b54679cb967fb19cd4312d38b4b15`).
  The default manager report rendered three seeded rows/cards with Manual,
  To Reorder, and Not Snoozed filters.

For every capture, the browser recorded `requestfailed: []`, `pageerror: []`,
and no HTTP response at or above 400. Odoo and Core3 document/body widths were
respectively `1440/1440/1440` at desktop and `390/390/390` at mobile. The
Odoo mobile captures use its observed `?view_type=kanban` responsive state.
Core3's shared `ListView` excludes views marked `mobile: true` from the
desktop tab set; therefore Replenishment has one desktop collection view and
does not render a tab strip there, while its mobile Kanban and the populated
responsive state remain usable. Changing that existing view-availability
contract would exceed this batch's explicit navigation-mode scope.

Verification:

- `bun test test/inventory_moves_history.integration.test.ts
  test/inventory_replenishment.integration.test.ts`: 6 tests, 73 assertions
  passed.
- `bun run audit`: passed — 498 pages, 505 routes, 879 datasources.
- `bun run lint`: passed; `bun run css:build:global` passed; `git diff --check`
  passed.

Evidence/docs commit is separate from implementation commit `a92285f5`;
screenshots remain under `/tmp` and are not committed.

## Bounded batch: Reporting > Stock contract (2026-09-11)

The next uncovered visible Inventory action is Reporting > Stock: Odoo XML ID
`stock.menu_product_stock` invokes `stock.action_product_stock_view` (live
action 540, model `product.product`, path `stock-report`, `list,form`, domain
`is_storable = True`). The existing Core3 `/stock` page is the separate On Hand
quant view and remains unchanged; this batch owns the explicit `/stock-report`
route and changes the Reporting menu item to that route.

The bounded surface is the authenticated stock report collection at 1440x900
and 390x844. It includes the Inventory at Date entry point, category filter,
product search, deterministic pager, and the stock columns Product,
Unit Cost, Total Value, On Hand, Free to Use, Incoming, Outgoing, and Unit.
History and Replenishment row links navigate to the already implemented
read-only Moves History and manager-only Replenishment surfaces. Odoo's New
product entry point, Forecast and Locations row links, product create/edit,
and the Inventory at Date result wizard are explicitly deferred beyond this
list contract.

The implementation must keep `pages/stock-report.yaml` layout-only and bind it
to `api/stock-report.yaml` through `page.id: stock-report`. A migration adds a
service-owned, deterministic stock-report projection dated `2026-01-15`, with
storable products covering zero, on-hand, reserved/free, incoming, outgoing,
and forecasted quantities plus category values. The API must expose stable
search/category filtering, an explicit empty/no-result state, 403 permission
state, and 503 transport state; the report is read-only and must not expose
CRUD or stale-write mutations.

## Bounded batch: Reporting > Stock implementation (2026-09-11)

The active Odoo 19 Inventory reference exposes `stock.menu_product_stock` /
`action_product_stock_view` as the Reporting > Stock list action. Core3 adds
the module-qualified route `/inventory/stock-report` with the Inventory at
Date entry point, product/category search, stock quantities, unit cost, total
value, and responsive mobile stock cards. Page YAML is layout-only and binds to
`api/stock-report.yaml` through `page.id: stock-report`.

Implementation commit: `469fd8e7` (`feat(inventory): add stock report parity`)
after contract commit `5a2d4a5c`; responsive card refinement is included in
the follow-up parent fix commit `d4158a15`. Migration `20260911290000-012` provides ten
stable storable-product rows with deterministic quantities and values. The
read-only `inventory.read` contract covers category filters, empty results,
transport errors, and the guarded Inventory at Date action; row actions link
to existing stock history and replenishment surfaces. Focused coverage passes
3 tests and 33 assertions.

Authenticated Core3 browser verification used `admin@tms.local` at 1440x900
and 390x844. Both states rendered ten stock rows/cards with exact
document/body widths and no page errors, failed requests, or HTTP error
responses. Odoo reference and Core3 captures remain under `/tmp`:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Stock report | 1440x900 | `/tmp/odoo-inventory-stock-report-desktop-20260911.png` | `3c337ebeeafcab66f9bc3864f2059513820d4ef6f7347dcd932fd63659f4083a` |
| Odoo Stock report | 390x844 | `/tmp/odoo-inventory-stock-report-mobile-20260911.png` | `7fcaf26bf7c18f050c1be68df07970f7716e2c8edfdfd0994f95f2dac54cf795` |
| Core3 Stock report | 1440x900 | `/tmp/core3-inventory-stock-report-current-1440x900.png` | `e29447066de5452f7b0b7806df9419ec68088899e0087cc31e1787ce557638ab` |
| Core3 Stock report | 390x844 | `/tmp/core3-inventory-stock-report-mobile-390x844-20260912.png` | `803424886fef0faedd4a853d22ba665d175d008f4fe499c92db10e4f40f55116` |

The bounded residual is the Odoo purple shell/search panel and Inventory at
Date wizard versus Core3's Fluent shell and shared date entry point. Images
are not committed.

## Operations Types bounded slice (2026-09-12)

The installed Odoo source action is `stock.action_picking_type_list`, exposed
as Inventory > Configuration > Operations Types by
`addons/stock/views/stock_picking_type_views.xml` (`menu_pickingtype`, sequence
2). Its list/form surface uses the `Operation Types` title, Operation Type
search, active/archive state, and operation-type fields; the form includes
warehouse, sequence, reservation, locations, lot/serial, package, and print
settings.

Core3 adds `/operation-types` and `/operation-types/detail` with separate
page/API YAML joined by `page.id`, manager-only permissions, deterministic
active/archived operation types, list filters/grouping, detail navigation, and
guarded create/edit/archive/restore actions. The migration is idempotent and
keeps open-transfer archive protection, duplicate-code, required-field,
invalid-kind, not-found, stale, empty, and transport contracts explicit.

Focused recovery verification: `bun test test/inventory_operation_types.integration.test.ts`
passes 3 tests and 24 assertions; the UI audit passes with 604 pages, 612
routes, and 1,039 datasources. The delegated run timed out before committing
and no authenticated desktop/mobile capture was produced; this slice makes no
visual-parity claim and adds no image files.

## Scrap Orders bounded slice (2026-09-12)

Core3 adds the Inventory Operations > Adjustments Scrap Orders action at `/inventory/scraps`, with list/kanban/pivot/graph declarations, detail form, page/API YAML joined by `page.id`, deterministic Draft/Done fixtures, and create/edit/validate/stale-write/done-delete guards. The focused test passes 3 tests and 25 assertions.

The live Odoo action is source-confirmed as `stock.action_stock_scrap` (action 547), but its reference database has no scrap rows. The isolated Core3 runtime was not available for a completed paired browser capture in this batch, so no new screenshot claim is made; screenshot gate remains open and images, if captured later, stay outside Git.

## Operations > Internal Transfers bounded slice (2026-09-12)

The next uncovered stock action after Stock and Scrap Orders is Odoo 19
`stock.action_picking_tree_internal`, launched by `stock.int_picking` in
`addons/stock/views/stock_picking_views.xml`. Its menu path is Inventory >
Operations > Transfers > Internal and its source menu is restricted to
`stock.group_stock_multi_locations`. The action path is `internal`, its
context restricts `stock.picking` to internal operation types, and its view
order is `list,kanban,form,calendar`; unlike Receipts and Deliveries it does
not expose Activity. The shared picking search view provides Status,
Scheduled Date, Source Document, Destination Country, Operation Type, and
Properties grouping. The existing transfer detail contract supplies the
shared list/detail fields and guarded status actions.

Core3 adds `/internal` only. `pages/internal.yaml` is layout-only with
`page.id: internal` and binds to the separate `api/internal.yaml` with the
same page id. It preserves visible List/Kanban/Form/Calendar tabs, Reference,
Contact, Scheduled Date, Source Document, Company, and Status columns, and
opens the shared transfer detail for a real list/detail interaction. Activity
is intentionally absent because the source action does not provide it. The
manifest inserts Internal between Deliveries and Physical Inventory under
Transfers.

Migration `20260912130000-014-inventory-internal-transfers.yaml` adds one
internal operation type and four stable Draft/Waiting/Ready/Done fixtures,
move lines, and dates around fixed `2026-01-15`; inserts are idempotent and
the down migration removes only these IDs. The datasource provides stable
search/status/date filtering, empty/no-result behavior, and the existing 503
`INVENTORY_TRANSFER_DATA_UNAVAILABLE` state. The route/datasource require
`inventory.multi_location`; shared detail mutations retain write,
state-transition, and row-version guards.

Focused evidence: `bun test test/inventory_internal_transfers.integration.test.ts`
passes 3 tests and 13 assertions, proving page/API ownership, menu and view
order, deterministic/idempotent fixtures, search, empty, transport-error,
and permission contracts. Browser QA inventory covers authenticated desktop
1440x900 and mobile 390x844 menu/list/filter/row-detail/no-overflow checks,
plus empty and denied exploratory states. Captures belong under
`/tmp/core3-odoo-parity/inventory-batch4-20260912/`; no visual parity claim is
made until authenticated Core3 actually renders at both viewports.

Recovery attempt on 2026-09-12: the isolated Core3 runtime was started with
`bun run dev --db=ddb --memory`, but it stopped before binding because Vite
raised `EMFILE: too many open files, watch .../vite.config.ts` and the backend
reported the unrelated catalog error `Named action sms_marketing.mailings.cancel
permission does not match its workflow transition`. The Odoo server was
reachable at `http://127.0.0.1:8069`, but the documented `codex@core3.local` /
`Core3Odoo2026!` login returned `Wrong login/password` in
`core3_codex_demo`, `core3_owned`, and `core3_reference`. The resulting login
pages were deleted; no authenticated Core3 or Odoo desktop/mobile capture was
produced, and this batch makes no visual-parity claim. Static evidence remains
the focused integration test, UI audit, inventory CSS build, and `git diff
--check`; the repository-wide typecheck is still blocked by pre-existing
errors outside Inventory and `sample` has no `lint` script.

## Products > Packages bounded slice (2026-09-12)

The next uncovered visible stock action is Odoo 19 `stock.action_package_view`, launched by `stock.menu_package` under Inventory > Products. The source is `addons/stock/views/stock_package_views.xml`; the menu is restricted to `stock.group_tracking_lot` and has sequence 102. The action is named `Packages`, uses model `stock.package`, orders views `list,kanban,form`, and defaults to internal locations plus main packages through its action context. The search view exposes Package Name, Location, and Package Type, filters `In internal locations` and `Main Packages`, and groups by Location and Package Type. The list columns are Package Name, Container, Package Type, Location, and optional Company. The kanban card contains the package name and type. The form contains Unpack, Package Transfers, Package Reference, Package Type, Owner, Location, Container, Company, Pack Date, and contained Product, Lot, Quantity, and Unit rows. The source's editable transfer-pack list is a linked workflow surface and remains deferred.

Core3 adds `/packages` and `/packages/detail`. `pages/packages.yaml` and `pages/package-detail.yaml` are presentation-only and bind by matching page IDs to `api/packages.yaml` and `api/package-detail.yaml`. Migration `0.0.16` adds stable internal, customer, nested, and empty package fixtures dated `2026-01-15`. The package action supports deterministic search, internal/main package filters, empty and 503 states, and tracking-user permission boundaries. Create/edit validates required and duplicate package references with 422/409 responses; Unpack is row-version guarded and makes package content empty.

Source correction on 2026-09-12: Odoo's `action_package_view` context enables both `In internal locations` and `Main Packages` by default. Core3 now activates both corresponding filters on `/packages`, with a focused contract assertion.

Focused evidence: `bun test test/inventory_packages.integration.test.ts` passes 3 tests and 21 assertions; `bun run audit` passes with 646 pages, 661 routes, and 1,109 datasources; `bun run css:build:inventory` and `git diff --check` pass. `sample` has no lint script, so `bun run lint` reports `Script not found "lint"`.

Authenticated capture attempt under `/tmp/core3-odoo-parity/` remains blocked: after `bun install --frozen-lockfile` installed the workspace dependencies, the isolated Core3 frontend still exits with Vite `EMFILE: too many open files, watch '.../sample/vite.config.ts'` under the permitted `ulimit -n 10000`; the limit cannot be raised in this environment. The backend also cannot provide a browser target after the frontend exits. No authenticated Core3 desktop/mobile screenshot was produced, and this slice makes no visual-parity claim; captures remain required in a browser-capable runtime.

Recovery evidence on 2026-09-12: the committed single-module runner (`bun run agent:module -- inventory --port=3316`) served the authenticated Inventory module without Vite file watching. Playwright using the installed system Chrome logged in as the seeded Core3 administrator and rendered `/inventory/packages` at 1440x900 and 390x844 with no console errors, page errors, failed requests, or HTTP error responses. Captures are `/tmp/core3-odoo-parity/inventory-single-run/core3-inventory-packages-desktop.png` and `core3-inventory-packages-mobile.png`. The same attempt reached the Odoo login page but the documented reference credentials were rejected, so no paired Odoo capture or visual-parity claim is made. Images remain outside Git.

## Configuration > Settings bounded slice (2026-09-12)

Core3 adds the manager-only Inventory > Configuration > Settings route at
`/inventory/settings`. The generic `/settings` path is deliberately avoided
because another module owns it during route discovery. The presentation page
uses the shared `SettingsView` and binds by `page.id: inventory-settings` to a
service-owned API fragment covering locations, warehouses, lots/serials,
packages, barcode, and reception-report controls.

Migration `0.0.17` adds deterministic `inventory_settings` defaults dated
`2026-01-15`. Its update mutation is persisted, idempotently installable, and
guarded by manager permission, missing-record `404`, and row-version `409`.
The literal `schema.yaml` / `demo.yaml` consolidation remains a follow-up:
the current shared migration loader discovers only timestamp-prefixed files, so
implementing that migration convention requires a shared loader change outside
this inventory assignment.

Focused evidence is recorded in `progress/inventory.md` and `qa/inventory.md`.
The authenticated Core3 page renders at desktop and mobile with no failed
requests or horizontal overflow. Direct authenticated API mutation succeeds.
The Settings Save browser journey remains blocked by the shared server-action
transport dropping `SettingsView` draft values; no shared runtime file is
changed in this module slice.

## Transfer form Unreserve operation (2026-09-13)

Core3 now exposes Odoo's form-bound `action_unreserve_picking` behavior on the
shared transfer detail. A current Ready transfer can be unreserved by an
`inventory.write` user; the guarded mutation moves it back to Waiting,
increments `row_version`, and records a deterministic timeline event. Missing,
stale, and non-Ready transfers are rejected with explicit 404/409 contracts.
Reservation quantities and move-line reservation records remain a follow-up
when those Inventory domain primitives are implemented.

Focused evidence: `test/inventory_transfer_workflow.integration.test.ts`
passes the layout/action contract and the Ready-to-Waiting mutation,
timeline, stale-row, and invalid-state assertions. Browser evidence for this
new form action remains a QA follow-up; no visual sign-off is claimed here.

## Products > Package Transfers bounded slice (2026-09-20)

The next source-backed package gap is the `stock.package` form stat button
`action_view_picking` from `addons/stock/models/stock_package.py`. Odoo builds
its `stock.action_picking_tree_all` result from pickings whose move lines have
the package as either `package_id` or `result_package_id`; the source action is
read-only and exposes `list,kanban,form,calendar` transfer views.

Core3 now adds the package-scoped `/packages/transfers` page. The package form
declares a permissioned `Package Transfers` stat button, and the matching
`api/package-transfers.yaml` fragment exposes the package context and distinct
transfer rows with source/result relation labels. The transfer rows open the
existing shared transfer detail, preserving one transfer workflow contract.
Migration `0.0.20` adds the durable `inventory_package_move_lines` relation
with deterministic source/result fixtures for main, nested, and customer
packages. The relation is idempotent and survives a file-backed close/reopen.

Focused evidence: `bun test test/inventory_package_transfers.integration.test.ts`
passes 3 tests and 22 assertions, covering page/API separation, stat routing,
deterministic source/result filtering, empty and transport states, tracking
permission denial, missing-package isolation, and restart persistence. This
bounded contract has no new authenticated browser or paired Odoo screenshot
claim; the visual/mobile gate remains open.

## Operations > Put in Pack bounded slice (2026-09-20)

Feature `INV-PACK-001` closes the next source-backed transfer/package gap:
Odoo's `stock.picking.action_put_in_pack`, exposed by the transfer Operations
form button in `addons/stock/views/stock_picking_views.xml` and delegated to
`stock.move.line.action_put_in_pack` in `addons/stock/models/stock_picking.py`.
The source creates a package, assigns move lines to it, and optionally accepts
a package type through `stock.action_put_in_pack_wizard` and
`stock_put_in_pack_views.xml`; its transfer button is limited to current
Waiting/Ready pickings and `stock.group_tracking_lot`.

Core3 keeps page and API contracts separate: the `transfer-detail` page adds a
permissioned `Put in Pack` header action, while the matching API fragment
declares a `server_form` with package reference/type fields and the
`stock.picking.put_in_pack` mutation. Migration `0.0.21` adds the deterministic
Desk Combination move to `delivery-00002`; the mutation persists the package,
contents, result-package relation, picking row-version increment, and timeline
event. Guards cover missing lines, invalid state, duplicate result package,
blank/duplicate reference, stale row, and `inventory.write` permission.

Focused contract evidence: `test/inventory_put_in_pack.integration.test.ts`
passes 3 tests and 18 assertions, including the stale boundary and file-backed
restart persistence. Authenticated Core3 evidence is committed under
`plan/odoo-ui-parity/evidence/inventory/2026-09-20/INV-PACK-001/`: desktop
dialog/after/reload and package-list captures, mobile detail, and JSON result
records. Core3 rendered the action, created `PACK-BROWSER-20260920`, showed the
Put in Pack timeline event, and retained the package after reload; desktop and
mobile widths remained 1440 and 390 with no failed requests.

Authenticated Odoo reference evidence is recorded in the same feature folder
for `codex@core3.local` at `http://127.0.0.1:8069`: desktop/mobile Ready
transfer captures and `odoo.json`. The reference transfer and source action
were inspected, but the button was not rendered for this account because the
Odoo view gates it with `stock.group_tracking_lot`; no Odoo mutation or visual
sign-off is claimed. The remaining parity gap is the full Odoo wizard behavior
for selecting an existing result package/package type and line-level package
semantics beyond this deterministic transfer path.

## Reporting > Stock Inventory at Date bounded slice (2026-09-20)

Feature `INV-STOCK-AT-DATE-001` closes the smallest remaining report/context
gap. Odoo's `stock.menu_product_stock` opens `stock.action_product_stock_view`,
whose list header invokes `stock.action_inventory_at_date` on the transient
`stock.quantity.history` wizard. The wizard accepts `inventory_datetime` and
reopens the stock report with `to_date` in context.

Core3 keeps `pages/stock-report.yaml` layout-only and extends the separate
`api/stock-report.yaml` with `inventory_stock_report_context` and a durable
`inventory_stock_at_date` server-form action. Migration `0.0.23` seeds a
deterministic 2026-01-15 context, records ISO date selections in
`inventory_stock_report_runs`, and filters the real stock datasource by the
latest company-scoped context. The page's `StatRow` shows the selected date and
request actor; the action refreshes the context and report sources.

Focused coverage proves idempotent migration, seeded context, 2026-01-14 empty
and 2026-01-16 restored report rows, invalid-date 422, wrong-company 403,
unauthorized page 403, and file-backed restart persistence. Fresh authenticated
Core3 desktop/mobile evidence and paired Odoo report/wizard evidence are under
`evidence/inventory/2026-09-20/INV-STOCK-AT-DATE-001/`. Odoo's mobile 390px
report does not expose the date control in its responsive action surface; this
is recorded as an exact comparison boundary, not claimed as parity.

## Configuration > Operations Types lifecycle slice (2026-09-20)

Feature `INV-OP-TYPES-001` closes the remaining lifecycle gap in the existing
Operations Types contract. Odoo source
`addons/stock/views/stock_picking_type_views.xml` defines
`stock.action_picking_type_list` and `stock.menu_pickingtype` under Inventory >
Configuration, with `list,form` views, active/archive filtering,
warehouse/company context, sequence/code, reservation, lot/package, location,
and print settings. The source form is titled `Operation Types`; the list
displays Sequence, Operation Type, Warehouse, and Company.

Core3 keeps `pages/operation-types.yaml` and
`pages/operation-type-detail.yaml` presentation-only and binds API fragments
by matching `page.id`. The list now binds its New control to the create action,
and the create/edit contracts expose operation kind plus durable source and
destination locations. Migration `0.0.24` backfills null row versions and sets
the durable default to 1. The API persists create, edit, archive, and restore
state with duplicate-code, required-field, invalid-kind, open-transfer, stale,
not-found, and manager-permission guards.

Focused evidence: `bun test test/inventory_operation_types.integration.test.ts
--timeout 20000` passes 3 tests and 41 assertions, including idempotent
fixtures, runtime page/action 403 boundaries, CRUD, archive protection, stale
writes, and file-backed restart. Authenticated Core3 desktop/mobile evidence
is under `evidence/inventory/2026-09-20/INV-OP-TYPES-001/`; the list, create
modal, detail, edit, reload, and responsive detail states have no browser
request/page failures. The authenticated Odoo user reaches `/odoo/action-426`
but the source action renders Odoo's generic `Oops!` error at both 1440x900 and
390x844; screenshots and JSON are retained as the exact blocker, so no Odoo
visual or mutation sign-off is claimed.

## Operations > Scrap Orders validation lifecycle slice (2026-09-20)

Feature `INV-SCRAP-001` closes the smallest remaining source-backed Operations
gap after Settings, Put in Pack, Package Transfers, Stock at Date, and
Operations Types. Odoo `stock.menu_stock_scrap` opens
`stock.action_stock_scrap` (`addons/stock/views/stock_scrap_views.xml:127-140`)
with `list,form,kanban,pivot,graph` modes. Its form exposes the Draft/Done
statusbar, `Validate` (`action_validate`), Stock Operation, and Product Moves
stat affordances (`stock_scrap_views.xml:24-47`). The source model creates a
stock move and move line, completes the move, writes Done/date_done, and may
replenish (`stock_scrap.py:125-167`).

Core3 keeps `pages/scraps.yaml` and `pages/scrap-detail.yaml` layout-only and
binds the API fragments by `page.id`. Migration `0.0.25` adds durable
`inventory_scrap_moves`, backfills deterministic moves for existing Done
fixtures, and the Validate mutation writes the Done/date context and one
durable Product Move. The detail page renders the read-only Product Moves line
grid. Required fields, duplicate references, stale revisions, Draft-only
validation/delete, duplicate move protection, and `inventory.read`/
`inventory.write` runtime boundaries are covered.

Focused Core3 coverage is in `test/inventory_scrap_orders.integration.test.ts`:
fixture/filter/error, CRUD/workflow, permission, idempotent migration, and
file-backed restart checks pass. An initial focused invocation encountered an
unrelated shared-checkout discovery boundary; the subsequent full Inventory
run passed after that boundary was repaired. Authenticated Core3 desktop/mobile evidence and paired
authenticated Odoo desktop/mobile comparison are under
`evidence/inventory/2026-09-20/INV-SCRAP-001/`. Odoo renders Scrap Orders and
the same list/form/kanban surface at `/odoo/scraps`; no Odoo mutation was made.
The final scoped audit and full Inventory suite passed; broader Inventory
sign-off remains open for the residual source behaviors listed above.

## Operations > Physical Inventory Apply All lifecycle slice (2026-09-20)

Feature `INV-PHYSICAL-001` closes the smallest remaining source-backed
Physical Inventory gap. Odoo `stock.menu_action_inventory_tree` invokes the
server action `stock.action_view_inventory_tree` in
`addons/stock/views/stock_quant_views.xml:4-21,361`; the editable inventory
list exposes Apply All and opens the `stock.inventory.adjustment.name` wizard
(`stock_quant_views.xml:229-270` and
`wizard/stock_inventory_adjustment_name.xml:3-31`). The wizard accepts
Inventory Reason and Counting Date, then applies only counted quants through
`stock_quant.py:402-468` and
`stock_inventory_adjustment_name.py:8-22`, creating the resulting inventory
move history.

Core3 now keeps `pages/physical-inventory.yaml` layout-only and moves all
datasources/actions to the matching `api/physical-inventory.yaml` fragment.
Migration `0.0.26` adds durable `inventory_adjustments` audit runs and a
deterministic opening run. The Apply All server form validates reason/date,
rejects an empty counted set, inserts deterministic move-history rows for
non-zero differences, updates only counted quants, and persists the run/count
metadata. Runtime permissions cover read, write, and manager-only row actions.

Focused coverage passes 4 tests / 39 assertions, including page/API
separation, deterministic fixture/audit data, counted-only Apply All behavior,
invalid/empty guards, move side effects, runtime permission denial, and
file-backed restart persistence. Authenticated Core3 desktop/mobile and Odoo
desktop/mobile evidence is under
`evidence/inventory/2026-09-20/INV-PHYSICAL-001/`. The final Core3 mobile
capture used a direct authenticated route with no HTTP/page errors or
horizontal overflow; no Odoo mutation was made. Full Inventory sign-off
remains open for the broader actor matrix and residual report/relocation
semantics.

## Operations > Check Availability reservations — `INV-TRANSFER-CHECK-AVAILABILITY-001` (2026-09-20)

This bounded slice closes the explicit transfer reservation follow-up after
lot traceability. Odoo's `stock.picking.action_assign` is exposed by the
transfer form's `Check Availability` button in
`addons/stock/views/stock_picking_views.xml:117-120`; its implementation in
`stock_picking.py:1196-1210` confirms eligible moves and delegates to
`stock.move._action_assign`, which reserves available quants. The paired
`do_unreserve` operation releases those reservations.

Core3 keeps `pages/transfer-detail.yaml` presentation-only and extends the
separate `api/transfer-detail.yaml` contract with reservation-aware detail and
move-line fields. Migration `20260920290000-032-inventory-transfer-reservations.yaml`
adds the durable actor/company reservation ledger and deterministic waiting
delivery fixture. Check Availability requires `inventory.write`, current
company, move lines, available stock, and the picking row version; it persists
the actor, reserved quant quantity, row revisions, and a timeline event.
Unreserve reverses the quant quantity and removes active reservation rows.

Focused coverage passes 8 tests / 73 assertions across the reservation and
transfer workflow suites. Authenticated Core3 desktop/mobile evidence is under
`evidence/inventory/2026-09-20/INV-TRANSFER-CHECK-AVAILABILITY-001/`.
The supplied authenticated Odoo user reached `/odoo/deliveries/2` at both
viewports, but that transfer was already Ready/Available, so Odoo hid Check
Availability and the action could not be executed. The exact blocker and
paired screenshots are recorded in the evidence folder; no Odoo mutation was
made. Full Inventory sign-off remains open.

## Operations > Physical Inventory Request a Count — `INV-PHYSICAL-REQUEST-COUNT-001` (2026-09-20)

This bounded slice closes the next smallest residual Physical Inventory wizard.
Odoo's `stock.menu_action_inventory_tree` / `stock.action_view_inventory_tree`
(`stock_quant_views.xml:278-321`) exposes manager-only `Request a Count`, which
opens `stock.action_stock_request_count` and the `stock.request.count` wizard
(`wizard/stock_request_count.xml:3-32`). The wizard accepts Scheduled at,
optional Assign to, and Show expected quantity; its `action_request_count`
updates the selected quants' inventory date and assignee
(`wizard/stock_request_count.py:31-54`) without applying counted quantities.

Core3 keeps `pages/physical-inventory.yaml` layout-only and adds a selectable
list bulk action joined to `api/physical-inventory.yaml` by `page.id`. The API
owns the manager-only form, assignee catalog, request history datasource, and a
transactional mutation. Migration
`20260920260000-029-inventory-count-requests.yaml` adds durable request headers
and selected-quant lines with an idempotent opening fixture. The mutation
updates selected internal/transit quants, records scheduled date/assignee/
visibility/requester metadata, rolls back invalid selections, and requires
`inventory.manage`.

Focused coverage passes 4 tests / 21 assertions, including page/API and source
contract, selected-quant scheduling and rollback, permission denial, and
file-backed restart persistence. Authenticated Core3 desktop selection/modal/
completion and mobile evidence is under
`evidence/inventory/2026-09-20/INV-PHYSICAL-REQUEST-COUNT-001/`. Authenticated
Odoo desktop/mobile Physical Inventory evidence is also recorded there. The
reference user renders the source list but does not expose the manager-only
Request a Count button; that exact group-gated boundary is retained as the Odoo
comparison blocker, and no Odoo mutation was made.

Status: bounded Core3 lifecycle and evidence complete for review. Full Inventory
sign-off remains open for the broader actor/company matrix and report/export
semantics.

## Reporting > Moves Analysis bounded slice — `INV-MOVES-ANALYSIS-001` (2026-09-20)

This slice closes the smallest remaining source-backed reporting gap after
Physical Inventory. Odoo's `stock.stock_move_menu` invokes
`stock_move_action` from `addons/stock/views/stock_move_views.xml:355-407`,
with menu placement at line 437. The action is the read-only `stock.move`
report at `/odoo/moves-analysis`; its source list defines the date, reference,
product, From/To, demand, quantity, unit, company, and state columns, default
Done context, and the Ready, To Do, Done, Incoming, Outgoing, Inventory, Date,
product, operation type, picking, source/destination, status, and scheduled
date search/group states (`stock_move_views.xml:27-63,320-363`). Odoo exposes
list, pivot, graph, kanban, and read-only form views (`stock_move_views.xml:4-25,
375-407`).

Core3 adds the Reporting > Moves Analysis menu and keeps
`pages/moves-analysis.yaml` and `api/moves-analysis.yaml` separate by
`page.id`. Migration `0.0.27` adds durable `inventory_stock_moves` fixtures
covering completed, ready/to-do, incoming, outgoing, internal, and inventory
adjustment moves. The report is read-only, exposes the source state/type/date
filters, pivot/graph/kanban/list modes, and opens the separate read-only
`move-analysis-detail` form page/API contract.

Focused coverage passes 4 tests / 41 assertions, including deterministic
filters/pivot/detail/error states, explicit no-CRUD/read permission boundaries,
and file-backed restart persistence. Authenticated Core3 desktop list/pivot/
detail and mobile evidence, plus authenticated Odoo desktop pivot/list and
mobile kanban evidence, is under
`evidence/inventory/2026-09-20/INV-MOVES-ANALYSIS-001/`. Both browser runs
reported no failed requests, page errors, or horizontal overflow. The normal
shared runner remains blocked by an unrelated committed Surveys page schema
boundary (`surveys/live-session-join.yaml`); the evidence runtime isolated
Auth/Chat/Inventory to avoid changing another owner's files. Full Inventory
sign-off remains open for the broader actor/company matrix, relocation, and
remaining report/export semantics.

## Operations > On Hand quant relocation — `INV-PHYSICAL-RELOCATE-001` (2026-09-20)

This bounded slice closes the smallest remaining source-backed relocation gap.
Odoo's `stock.action_view_quants` server action (`stock_quant_views.xml:213-223`)
opens the Locations/On Hand quant list; its manager-only `Relocate` object action
is declared at `stock_quant_views.xml:108-117`. The action opens the transient
`stock.quant.relocate` wizard (`wizard/stock_quant_relocate.py:9-99`), which
requires an active internal destination and invokes `stock.quant.move_quants`
with the source quant's full positive quantity. The move implementation records
the source/destination as `Quantity Relocated` (`models/stock_quant.py:452-466,
1545-1557`).

Core3 keeps `pages/stock.yaml` presentation-only and joins it by `page.id: stock`
to the separate `api/stock.yaml`. The API owns the manager-only row action and
wizard fields, while migration `20260920250000-028-inventory-quant-relocation.yaml`
adds durable `inventory_quant_relocations` audit rows and a deterministic opening
fixture. Relocation updates the quant location with optimistic concurrency,
preserves lot/product/quantity metadata, inserts a durable relocation audit and
`inventory_move_lines` row, and rejects non-positive, stale, same-location,
non-internal, and same-product destination conflicts.

Focused coverage passes 4 tests / 21 assertions, including page/API separation,
deterministic workflow guards and move-history side effects, manager-only runtime
permission, and file-backed restart persistence. Authenticated Core3 desktop
modal/complete and mobile evidence plus authenticated Odoo desktop/mobile source
comparison are under
`evidence/inventory/2026-09-20/INV-PHYSICAL-RELOCATE-001/`; final browser runs
reported no page failures or horizontal overflow. No Odoo mutation was made.

Status: bounded relocation lifecycle complete for review. Full Inventory sign-off
remains open for the broader actor/company matrix and remaining report/export
semantics.

## Operations > Physical Inventory Clear/reset — `INV-PHYSICAL-RESET-001` (2026-09-20)

This bounded slice closes the next smallest source-backed Physical Inventory
gap after Request a Count. Odoo's `stock.menu_action_inventory_tree` /
`stock.action_view_inventory_tree` exposes manager-only `Clear`, invoking
`stock.quant.action_reset`, `stock.inventory.warning`, and then
`action_clear_inventory_quantity` to discard unapplied counts.

Core3 keeps `pages/physical-inventory.yaml` layout-only and adds the manager
bulk action; `api/physical-inventory.yaml` owns the confirmation, reset-run
datasource, company scope, selected-quant mutation, and permission. Migration
`20260920270000-030-inventory-count-resets.yaml` persists reset headers/lines
and deterministic seed data. The mutation clears counted state, increments row
versions, records actor and selected rows, rejects invalid/cross-company/stale
requests, and survives restart.

Focused coverage passes 4 tests / 20 assertions. Authenticated Core3 desktop
and mobile list/selection/confirmation captures plus paired authenticated Odoo
desktop/mobile source-list captures are under
`evidence/inventory/2026-09-20/INV-PHYSICAL-RESET-001/`. The supplied Odoo
user is not in `stock.group_stock_manager`, so its source Clear modal is not
reachable; this exact blocker is recorded and no Odoo mutation was made.

Status: bounded Core3 lifecycle and evidence complete for review. Full
Inventory sign-off remains open for the broader actor/company matrix and
remaining report/export semantics.

## Products > Lot Traceability report — `INV-LOT-TRACEABILITY-001` (2026-09-20)

This bounded slice closes the smallest remaining source-backed report gap after
the completed lot/serial CRUD surface. Odoo's lot form exposes the Traceability
stat button (`stock.action_stock_report`), which loads the authenticated stock
traceability report and its PDF route with Reference, Product, Date,
Lot/Serial, From, To, and Quantity columns.

Core3 keeps `pages/lot-detail.yaml` and the new
`pages/lot-traceability.yaml` layout-only, joined to API fragments by page ID.
The traceability API provides company-scoped deterministic context, completed
move lines, report history, and a permissioned Print client action backed by a
durable report-run mutation. Migration
`20260920280000-031-inventory-lot-traceability.yaml` adds report runs and a
stable traceable lot/move fixture. Actor, company, stale row-version, empty,
permission, and restart guards are covered.

Focused coverage passes 4 tests / 20 assertions. Authenticated Core3 desktop
and mobile evidence plus paired authenticated Odoo lot-list comparison are
under `evidence/inventory/2026-09-20/INV-LOT-TRACEABILITY-001/`. The supplied
Odoo user could not reach the selected lot form/stat action; the exact mobile
asset failures are recorded in `odoo.json`. No Odoo mutation was made.

Status: bounded report lifecycle complete for review. Full Inventory sign-off
remains open for the broader actor/company matrix and remaining report/export
semantics.

## Operations > Transfer Return lifecycle — `INV-TRANSFER-RETURN-001` (2026-09-20)

This bounded slice closes the smallest remaining non-duplicated transfer
workflow after reservation/availability: Odoo's completed-transfer Return
wizard. The source action is `act_stock_return_picking` from the Done picking
form (`addons/stock/views/stock_picking_views.xml:129-143`), with wizard
fields/actions in `addons/stock/wizard/stock_picking_return_views.xml` and
reverse-picking behavior in `stock_picking_return.py`.

Core3 keeps `pages/transfer-detail.yaml` presentation-only and joins it to
`api/transfer-detail.yaml` by `page.id`. The API owns the permissioned Done-only
Return form, quantity/reason fields, company/actor/current-row guards, durable
return history, reverse source/destination picking and move, and timeline
event. Migration `20260920300000-033-inventory-transfer-returns.yaml` adds
deterministic data and durable return rows. This bounded implementation
supports exactly one completed source move line and returns a Waiting receipt;
multi-line selection, Return All, exchange, and later return validation remain
open source-backed gaps.

Focused tests pass 8 tests / 73 assertions across the return and transfer
workflow suites, including permission, company, quantity, stale, actor,
restart, and no-partial-state checks. Authenticated Core3 desktop/mobile and
paired Odoo comparison/blocker evidence is under
`evidence/inventory/2026-09-20/INV-TRANSFER-RETURN-001/`. The supplied Odoo
account reached Done/Available deliveries but exposed no Return action or
wizard across delivery routes 1-10; the exact blocker is recorded and no
Odoo mutation was made.

Status: bounded Core3 lifecycle complete for review. Full Inventory sign-off
remains open.

## Operations > Transfer email queue — `INV-TRANSFER-EMAIL-001` (2026-09-21)

This bounded slice covers Odoo's transfer-bound `Send email` action, declared
as `action_lead_mass_mail` on the stock picking list/kanban in
`addons/stock/views/stock_picking_views.xml:513-523`. The target is the
`mail.compose.message` wizard (`addons/mail/wizard/mail_compose_message_views.xml:4-18,55,67-90`),
whose mass-mail dispatch is selected in
`addons/mail/wizard/mail_compose_message.py:804-807`.

Core3 keeps `pages/receipts.yaml` and `pages/deliveries.yaml` presentation-only
and owns the Send email forms in `api/transfers.yaml` and
`api/deliveries.yaml`. The action validates recipient, subject, and body,
requires `inventory.write`, current company, actor, a non-cancelled transfer,
and the expected row version, then queues a durable outbox row and records
the actor/timeline event. `transfer-detail.yaml` exposes queued history.
Migration `20260921110000-037-inventory-transfer-emails.yaml` adds the
outbox, idempotent schema, and deterministic `WH/OUT/EMAIL/0001` fixture.
This bounded Core3 mapping intentionally supports one selected transfer;
Odoo's multi-record mass-mail behavior and external SMTP dispatch remain
open.

Focused verification passes 8 tests / 73 assertions across the email and
transfer workflow suites, with restart, permission, company, actor,
row-version, state, content, migration replay, and no-partial-state coverage.
Authenticated Core3 desktop/mobile evidence is under
`evidence/inventory/2026-09-21/INV-TRANSFER-EMAIL-001/`. The exact Odoo
source comparison and live-route blocker are recorded there; no Odoo mutation
or full Inventory sign-off is claimed.

## Operations > Transfer Product Labels — `INV-TRANSFER-LABELS-001` (2026-09-21)

This bounded slice covers Odoo's transfer-bound `Labels` action from
`addons/stock/views/stock_picking_views.xml:477-487`, its
`action_open_label_type` branch in `addons/stock/models/stock_picking.py:1984-1995`,
and the `picking.label.type` wizard in
`addons/stock/wizard/stock_label_type.py:7-29` and `.xml:3-18`.

Core3 keeps the page/API split: the transfer page exposes `Labels` and report
history, while the API prepares a Product Labels/PDF run with durable
company/actor/row-version/state guards and timeline attribution. Migration
`20260921100000-036-inventory-transfer-labels.yaml` adds deterministic fixture
`delivery-labels-0001`. The focused suite passes 4 tests / 20 assertions,
including restart, replay, permission, and no-partial-state guards.

Evidence is under
`evidence/inventory/2026-09-21/INV-TRANSFER-LABELS-001/`. Core3 authenticated
desktop/mobile capture is blocked by the unrelated Ecommerce discovery error;
Odoo visual capture and mutation remain open. Lot/SN labels and downstream
layout/ZPL options are explicitly deferred. Full Inventory sign-off remains
open.

## Operations > Transfer Lock/Unlock lifecycle — `INV-TRANSFER-LOCK-001` (2026-09-21)

This bounded slice closes the smallest remaining non-duplicated transfer actor
behavior after Return and Backorder: Odoo's form-only Lock/Unlock server action.
The source binding is `addons/stock/views/stock_picking_views.xml:490-501`,
manager-gated by `stock.group_stock_manager`; the model field and toggle are
in `addons/stock/models/stock_picking.py:658-661,1529-1532`.

Core3 keeps `pages/transfer-detail.yaml` presentation-only and joins it to
`api/transfer-detail.yaml` by `page.id`. The API owns the manager-only
Lock / Unlock action, persisted `is_locked` detail field, company/actor/
current-row/cancelled guards, and timeline event. Migration
`20260921090000-035-inventory-transfer-locks.yaml` adds durable lock state and
deterministic defaults. This slice toggles the state and records audit context;
broader field-level editability remains open.

Focused tests pass 8 tests / 67 assertions across the lock and transfer
workflow suites, including permission, company, actor, stale, cancelled,
timeline, and restart checks. Authenticated Core3 desktop/mobile and paired
Odoo comparison/blocker evidence is under
`evidence/inventory/2026-09-21/INV-TRANSFER-LOCK-001/`. The supplied Odoo
account reaches transfer forms but does not expose the manager-gated action;
the exact blocker is recorded and no Odoo mutation was made.

Status: bounded Core3 lifecycle complete for review. Full Inventory sign-off
remains open.

## Operations > Partial transfer Backorder confirmation — `INV-TRANSFER-BACKORDER-001` (2026-09-20)

This bounded slice closes the smallest remaining non-duplicated transfer
workflow after Return: Odoo's partial-validation backorder confirmation. The
source invokes `stock.backorder.confirmation` from
`addons/stock/models/stock_picking.py:1413-1492`; its wizard view and process
methods are in `addons/stock/wizard/stock_backorder_confirmation_views.xml`
and `.py`. The source offers Create Backorder and No Backorder, and creates a
linked picking containing only remaining move quantities.

Core3 keeps `pages/transfer-detail.yaml` presentation-only and joins it to
`api/transfer-detail.yaml` by `page.id`. The API owns the partial Ready-only
Create Backorder form, decision options, permission/company/actor/current-row
guards, durable backorder history, source move split, linked backorder
picking/move, and timeline event. Migration
`20260920310000-034-inventory-transfer-backorders.yaml` adds deterministic data
and durable relation/decision rows. This bounded implementation supports one
partial completed move line; multi-transfer selection remains open.

Focused tests pass 8 tests / 75 assertions across the backorder and transfer
workflow suites, including Create/No decisions, permission, company, actor,
decision, stale, no-partial-state, and restart checks. Authenticated Core3
desktop/mobile and paired Odoo comparison/blocker evidence is under
`evidence/inventory/2026-09-20/INV-TRANSFER-BACKORDER-001/`. The supplied
Odoo account exposes no partial fixture or backorder wizard on deliveries 1-3,
and `/odoo/backorders` redirects to Discuss; the exact blocker is recorded and
no Odoo mutation was made.

Status: bounded Core3 lifecycle complete for review. Full Inventory sign-off
remains open.

## Products > Package location relocation — `INV-PACKAGE-RELOCATE-001` (2026-09-21)

This bounded slice covers the remaining Packages detail behavior after package
CRUD, Unpack, Put in Pack, and Package Transfers: changing a non-empty
package's Location. Odoo exposes the editable field in
`addons/stock/views/stock_package_views.xml:29-70`; `stock.package.write` in
`addons/stock/models/stock_package.py:289-307` rejects empty-package moves,
moves positive contained quantities, and uses the reason `Package manually
relocated`. The menu/action source is `stock.menu_package` /
`stock.action_package_view` at `stock_package_views.xml:144-164`.

Core3 keeps `pages/package-detail.yaml` layout-only and adds a permissioned
Relocate form plus relocation-history grid. `api/package-detail.yaml` owns the
destination catalog, `inventory.packages.relocate` action, durable audit row,
and actor/company/state/same-location/row-version guards. Migration
`20260921120000-038-inventory-package-relocations.yaml` adds the audit table
and deterministic `PACK/RELOCATE/0005` fixture in Core3 Demo Company. This
bounded contract records package-level movement and contained quantity; full
quant-chain, nested-container propagation, and bulk package-list actions stay
open.

Focused verification passes 8 tests / 53 assertions across the relocation and
package suites, including restart, migration replay, permission, and
no-partial-state guards. Authenticated Core3 desktop/mobile evidence is under
`evidence/inventory/2026-09-21/INV-PACKAGE-RELOCATE-001/`. Odoo live paired
execution was not captured and no Odoo mutation or full Inventory sign-off is
claimed.
## Reporting > Forecasted Report — `INV-STOCK-FORECAST-001` (2026-09-21)

This bounded slice covers Odoo's product Stock report `View Availability` /
Forecasted Report client action after the existing Stock at Date report,
Moves History, and Moves Analysis slices. Odoo binds
`stock.menu_product_stock` / `stock.action_product_stock_view` in
`addons/stock/views/product_views.xml:618-626,663-664`; product kanban/form
use `action_product_forecast_report` at `product_views.xml:306-308,319-328`,
which resolves `stock_forecasted_product_product_action` in
`models/product.py:697-700` and `views/stock_forecasted.xml:4-14`.

Core3 keeps `pages/stock-report.yaml` presentation-only and joins it to
`api/stock-report.yaml` by `page.id`; its Forecast row action navigates to the
new `stock-forecast` page. The paired page/API exposes company-scoped context,
deterministic incoming/outgoing forecast lines, report history, and a
permissioned Refresh Forecast action. Migration
`20260921130000-039-inventory-stock-forecast.yaml` persists lines and runs.
Refresh enforces `inventory.read`, current-company, authenticated actor,
non-empty forecast, and product row-version guards, and survives restart.

Focused verification passes 12 tests / 97 assertions across the forecast,
stock-report regression, and package-relocation suites. Authenticated Core3
desktop/mobile evidence is under
`evidence/inventory/2026-09-21/INV-STOCK-FORECAST-001/`; both viewports show
the product entry, Forecasted Report, seeded opening/incoming lines, refresh
history, no request/page errors, and no horizontal overflow. Odoo login was
reachable, but the bounded authenticated `/odoo/stock-report` capture did not
complete; the exact blocker is recorded in the paired evidence files. No Odoo
mutation or full Inventory sign-off is claimed.
## Reporting > Stock product Locations — `INV-STOCK-LOCATIONS-001` (2026-09-21)

This bounded slice covers the remaining product-row Locations workflow in the
Odoo Stock report after Stock at Date and Forecasted Report. Odoo's stock list
defines the Locations button at
`addons/stock/views/product_views.xml:585-592`; it invokes
`stock.action_view_quants`, passes `search_default_product_id` and
`default_product_id`, and is restricted to `stock.group_stock_multi_locations`.
The action/server context is in `stock_quant_views.xml:213-224`, and
`stock.quant.action_view_quants` sets the internal-location context in
`stock_quant.py:395-399`.

Core3 keeps `pages/stock-report.yaml` presentation-only and joins it to
`api/stock-report.yaml` by `page.id`; its Locations row action opens the new
`stock-locations` page. The paired page/API exposes product-scoped
internal/transit quant rows with location, lot, reservation, availability, and
stock value, plus a durable Refresh Locations report ledger. Migration
`20260921140000-040-inventory-stock-locations.yaml` adds deterministic history;
the report action enforces `inventory.read`, current company, authenticated
actor, non-empty locations, and product row-version guards.

Focused verification and authenticated Core3 desktop/mobile evidence are
recorded under
`evidence/inventory/2026-09-21/INV-STOCK-LOCATIONS-001/`. Odoo Stock rendered
at both viewports, but the supplied account lacks the source multi-location
group so the Locations button/detail could not be reached; the exact blocker
is recorded and no Odoo mutation or full Inventory sign-off is claimed.

## Reporting > Product Replenish wizard — `INV-PRODUCT-REPLENISH-001` (2026-09-21)

This bounded slice covers the next uncovered product operation after the Stock
Forecast and Locations actions: Odoo's product form `Replenish` server actions
in `addons/stock/views/product_views.xml:39-85`. They open the
`product.replenish` modal; the source form and `launch_replenishment` lifecycle
are in `addons/stock/wizard/product_replenish_views.xml:3-61` and
`product_replenish.py:9-115`. The source captures forecasted quantity,
quantity/UoM, scheduled date, warehouse, route, and Confirm.

Core3 keeps `pages/stock-report.yaml` separate from `api/stock-report.yaml`
and adds a manager-gated Replenish row action to the paired
`/stock-report/replenish` page/API (`page.id: product-replenish`). The API
exposes product context, active warehouse and route choices, and durable
request history. Migration
`20260921150000-041-inventory-product-replenishment.yaml` adds deterministic
request data. Confirm inserts a Requested request with actor/company context
and guards product, company, actor, row version, quantity, date, warehouse,
and route. Downstream procurement-rule/PO or manufacturing notification
generation remains open.

Focused verification passes 8 tests / 76 assertions across the product wizard
and Stock report regression suites. Authenticated Core3 desktop/mobile and
paired Odoo comparison/blocker evidence is under
`evidence/inventory/2026-09-21/INV-PRODUCT-REPLENISH-001/`. Full Inventory
sign-off remains open.

## Procurement > Replenishment Information — `INV-REPLENISH-INFO-001` (2026-09-21)

This bounded slice covers Odoo's source-backed Replenishment Information action
and Forecast Description context after Product Replenish. The source is
`addons/stock/views/stock_orderpoint_views.xml:24-63,143`,
`addons/stock/wizard/stock_replenishment_info.xml:3-61`,
`stock_replenishment_info.py:16-267`, and
`stock_orderpoint.py:328-340`. Odoo provides transient min/max guidance,
lead-time and demand context, forecast graph data, warehouse/route options, and
Save/Close behavior.

Core3 adds the paired `pages/replenishment-info.yaml` and
`api/replenishment-info.yaml` contracts joined by `page.id`, a replenishment
row action, deterministic demand/history fixtures, and migration
`20260921160000-042-inventory-replenishment-info.yaml`. The API persists report
opens and Save Rule min/max/route changes with manager permission, current
company, authenticated actor, and row-version/range/route guards. Focused
verification passes 7 tests / 57 assertions; authenticated Core3 desktop/mobile
and paired Odoo captures are under
`evidence/inventory/2026-09-21/INV-REPLENISH-INFO-001/`. Odoo renders the
reachable Replenishment screens but does not expose the source information
action to the supplied account; the exact blocker is recorded. Downstream
procurement generation and full Inventory sign-off remain open.

## Configuration > Warehouse Management > Routes — `INV-ROUTES-001` (2026-09-21)

This bounded slice covers Odoo's Routes configuration workflow. The source
menu/action and model are in
`addons/stock/views/stock_location_views.xml:174-268` and
`addons/stock/models/stock_location.py:518-580`: `action_routes_form` opens
`stock.route`, with company, warehouse, product/category/package applicability,
and rule relations. The menu is `menu_routes_config` under Warehouse
Management and is restricted by `stock.group_adv_location`.

Core3 keeps `pages/routes.yaml` and `pages/route-detail.yaml` presentation-only
and joins them to `api/routes.yaml` and `api/route-detail.yaml` by `page.id`.
Migration `20260921170000-043-inventory-routes.yaml` adds deterministic route
and rule data. The manager-gated lifecycle supports list filters, create,
detail/rules, edit, archive/restore, and delete-without-rules, with durable
company, actor, and row-version guards. Focused tests cover discovery,
permissions, company scope, CRUD, migration replay, and restart reads.

Authenticated Core3 desktop/mobile evidence is under
`evidence/inventory/2026-09-21/INV-ROUTES-001/`. The supplied authenticated
Odoo account reaches Inventory Configuration but does not receive
`stock.group_adv_location`, so Routes is absent from the menu at both the
reachable desktop/mobile comparison boundary. The exact blocker is recorded;
no Odoo mutation or full Inventory sign-off is claimed.

## Configuration > Warehouse Management > Putaway Rules — `INV-PUTAWAY-RULES-001` (2026-09-21)

This bounded slice covers Odoo's visible Putaway Rules configuration action.
`addons/stock/views/product_strategy_views.xml:3-107` defines the
`stock.putaway.rule` list, editable target/location/strategy fields,
`action_putaway_tree`, search filters, and the `menu_putaway` menu under
Warehouse Management. The model is defined in
`addons/stock/models/product_strategy.py:17-95`: product or category target,
arrival and destination locations, package type, storage category, priority,
company, active state, and `no` / `last_used` / `closest_location` strategy.
The source menu requires `stock.group_stock_multi_locations`.

Core3 keeps `pages/putaway-rules.yaml` and
`pages/putaway-rule-detail.yaml` presentation-only and joins them to
`api/putaway-rules.yaml` and `api/putaway-rule-detail.yaml` by `page.id`.
Migration `20260921190000-045-inventory-putaway-rules.yaml` adds deterministic
product/category rules and location strategy fixtures. The manager-gated
lifecycle supports list filters, create/edit, archive/restore, delete,
current-company scope, distinct arrival/store locations, target/strategy
validation, and row-version guards.

Authenticated Core3 desktop/mobile evidence is under
`evidence/inventory/2026-09-21/INV-PUTAWAY-RULES-001/`. The bounded Odoo probe
remained at the login route for both viewports; the exact blocker is recorded
with the source/menu comparison. No Odoo mutation or full Inventory sign-off
is claimed.

## Configuration > Warehouse Management > Storage Categories — `INV-STORAGE-CATEGORIES-001` (2026-09-21)

This bounded slice covers Odoo's `stock.storage.category` configuration
workflow. `addons/stock/views/stock_storage_category_views.xml:3-100`
defines the list/form action, Locations stat action, product/package capacity
one-to-many grids, and `menu_storage_categoty_config`; the menu is restricted
to `stock.group_stock_multi_locations`. The model and constraints are in
`addons/stock/models/stock_storage_category.py:7-74`: name, non-negative
maximum weight, empty/same/mixed product policy, company, product/package
capacity rules, and location assignments.

Core3 keeps `pages/storage-categories.yaml` and
`pages/storage-category-detail.yaml` presentation-only and joins them to
`api/storage-categories.yaml` and `api/storage-category-detail.yaml` by
`page.id`. Migration `20260921180000-044-inventory-storage-categories.yaml`
adds durable categories, product/package capacities, and location assignments.
The lifecycle supports list/detail, category create/edit/delete, capacity-line
create/edit/delete, location drilldown, current-company filtering, duplicate
and in-use guards, and parent/line row-version concurrency.

Authenticated Core3 desktop/mobile evidence is under
`evidence/inventory/2026-09-21/INV-STORAGE-CATEGORIES-001/`. The bounded Odoo
probe reached the Odoo login route but its POST failed for the supplied account;
the source/menu/group blocker and untrusted comparison state are recorded in
the paired evidence. No Odoo mutation or full Inventory sign-off is claimed.

## Overview operation cards — `INV-OVERVIEW-001` (2026-09-21)

This bounded ninth-wave slice covers Odoo's Inventory root
`stock_picking_type_menu` / `stock_picking_type_action` from
`addons/stock/views/stock_picking_type_views.xml:16-39,180-293`. The source is a
non-editable `kanban,form` operation dashboard: each operation card exposes
Ready, Waiting, Late, Back Orders, and Operations counters, plus the
All/Ready/Waiting queue actions and operation-kind-specific primary label.

Core3 adds `pages/overview.yaml` and `api/overview.yaml`, joined by
`page.id: inventory-overview`, and exposes `/inventory/overview` in the
Inventory menu. The API aggregates durable operation types, pickings, and move
lines into deterministic cards, while `stock.inventory_overview.open` records
the selected queue filter and actor in durable `inventory_overview_runs`.
Migration `20260921200000-046-inventory-overview.yaml` seeds the opening
history row. The queue action requires `inventory.read`, current-company
scope (including the existing Core3 Demo Company/My Company fixture alias), an
authenticated actor, a valid source filter, and the current operation-card
row version.

Focused verification passes 4 tests / 22 assertions, including discovery and
page/API separation, deterministic counters/history, permission/company/
filter/stale guards, and restart persistence. Authenticated Core3 desktop and
mobile captures include card and queue-form states under
`evidence/inventory/2026-09-21/INV-OVERVIEW-001/`. Authenticated Odoo desktop
and mobile `/odoo/inventory` captures render the source operation cards; the
fixture count differences and one unrelated mobile Discuss-avatar abort are
recorded in paired evidence. New/configuration/report card-menu behavior
remains explicitly deferred; full Inventory sign-off remains open.
