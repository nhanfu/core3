# Source comparison

## Odoo

`addons/stock/views/stock_picking_type_views.xml` declares:

- `stock.action_picking_type_list`, model `stock.picking.type`, view modes
  `list,form`.
- `stock.menu_pickingtype`, label `Operations Types`, parent
  `stock.menu_warehouse_config`, sequence 2.
- Search fields for name/warehouse, Favorites and Archived filters, and group
  by operation code or warehouse.
- List fields for sequence, name, warehouse, and company.
- Form sections General and Hardware, including code, sequence prefix,
  warehouse/company, reservation/backorder/move policy, lot/serial and package
  flags, source/destination locations, and print settings.

The authenticated reference browser reaches `/odoo/action-426`, but both
1440x900 and 390x844 render the generic Odoo `Oops!` error before the list or
form. See `odoo.json` and the paired screenshots for the exact blocker.

## Core3

Core3 exposes the Configuration menu item at `/inventory/operation-types`, with
page-only list/detail YAML and API-only datasource/action YAML joined by
`page.id`. The create contract now binds the visible New control and includes
operation kind, source location, destination location, sequence, warehouse,
and company. Detail updates retain source/destination IDs and display their
durable location names. Archive/restore and edit mutations require
`inventory.manage` and expected row versions.
