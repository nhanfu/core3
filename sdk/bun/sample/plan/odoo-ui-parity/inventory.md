# Inventory — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `stock`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify the `stock` manifest's demo declaration; use warehouses, locations, products, and transfers from demo data.
- Core3 service: `inventory`.

## Menu, action, and view inventory

- Inventory dashboard, Operations: transfers, receipts, delivery orders, internal transfers; Products: products, lots/serials, packages; Reporting: stock, moves, valuation; Configuration: warehouses, locations, routes, rules, operation types.
- Transfer list/kanban with draft/ready/waiting/done/cancelled states, filters, group-by, pager, and batch actions.
- Transfer form: source/destination, operation type, scheduled date, move lines, lots/serials, packages, reservation/validate/cancel/backorder dialogs, activities, and chatter.
- Product, lot/serial, location, and warehouse forms; stock dashboard cards and mobile barcode/overflow layout.

## Core3 backend mock-data coverage

Declare `stock_dashboard`, `stock_transfers`, `stock_move_lines`, `stock_products`, `stock_locations`, `stock_warehouses`, `stock_lots`, `stock_packages`, `stock_operation_types`, `stock_routes`, and `stock_reports`. Cover all transfer states, reserved/unreserved/backorder, lot/package selection, empty/filter/group/paginated lists, validation/cancel dialogs, barcode/mobile, and valuation/report rows. Include quantities, UoM, locations, dates, and relational options; each datasource remains query-swappable.

## Shared UI primitives

Dashboard cards, control panel/search/pager, list/kanban/form, status badges, editable move lines, barcode/scanner surface, many2one/tag selectors, dialogs, chatter, report tables/charts, and responsive navigation.

## Screenshots and acceptance checks

Capture `/odoo/inventory` dashboard and every operation/product/report/configuration action at 1440x900 and 390x844. Check quantities and state labels, warehouse hierarchy, backorder flow, mobile controls, report totals, YAML completeness, and offline rendering before `ready`.
