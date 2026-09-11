# Inventory UI parity

Status: ready

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
