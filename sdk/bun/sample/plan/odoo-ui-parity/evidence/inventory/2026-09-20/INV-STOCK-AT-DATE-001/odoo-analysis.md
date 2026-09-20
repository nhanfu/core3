# Odoo analysis

Source reviewed:

- `/home/nhanjs/projects/odoo/addons/stock/views/product_views.xml`
- `/home/nhanjs/projects/odoo/addons/stock/wizard/stock_quantity_history.py`
- `/home/nhanjs/projects/odoo/addons/stock/wizard/stock_quantity_history.xml`

Source contract:

- Menu: Inventory → Reporting → Stock.
- Menu XMLID: `stock.menu_product_stock`.
- List action: `stock.action_product_stock_view`, model `product.product`,
  path `stock-report`, list/form views, storable-product domain.
- Header action: `stock.action_inventory_at_date`, model
  `stock.quantity.history`, form target `new`, with `inventory_datetime`.
- Wizard label/help: “Inventory at Date”, “Choose a date to get the inventory
  at that date”; Confirm invokes `open_at_date`, which reopens the stock list
  with `to_date` in context. Cancel closes the modal.
- The stock list exposes product quantities, History, Replenishment, Locations,
  and Forecast actions; this slice owns only the date wizard/context.

Fresh authenticated evidence uses `codex@core3.local` at
`http://127.0.0.1:8069/odoo/stock-report`. Desktop renders the date wizard.
At 390x844 the report renders without the Inventory at Date control in the
responsive action surface; this exact state is retained in `odoo.json` and the
mobile screenshot rather than claimed as a mobile wizard pass.
