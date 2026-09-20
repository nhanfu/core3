# Odoo source/menu/action analysis

Local source inspected:

- `addons/stock/views/stock_move_views.xml:4-25` defines the Stock Moves
  Analysis pivot and graph views with `Stock Moves Analysis` labels.
- `stock_move_views.xml:27-63` defines the read-only `Moves` list: date,
  reference, product, From, To, Total Demand, Total Quantity, unit, company,
  and state.
- `stock_move_views.xml:320-352` defines search filters Ready, To Do, Done,
  Incoming, Outgoing, Inventory, Date, and group-by Product, Operation Type,
  Picking, Source/Destination Location, Status, and Scheduled Date.
- `stock_move_views.xml:355-363` defines `stock_move_action`, model
  `stock.move`, path `moves-analysis`, default Done context, and pivot
  measures quantity/count; lines 375-407 attach list/form/pivot/graph/kanban.
- `stock_move_views.xml:437` defines menu `stock_move_menu`, label Moves
  Analysis, under `stock.menu_warehouse_report`.

Authenticated Odoo evidence shows the live report at
`/odoo/moves-analysis`: desktop pivot/list and mobile kanban. No write was
performed against Odoo.
