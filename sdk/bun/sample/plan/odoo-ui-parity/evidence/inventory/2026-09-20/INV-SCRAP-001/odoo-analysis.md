# Odoo source analysis

Source checkout: `/home/nhanjs/projects/odoo`

- `addons/stock/views/stock_scrap_views.xml:24-80` defines the `stock.scrap`
  form. It exposes Draft/Done, `action_validate`, Stock Operation, Product
  Moves, product/quantity/UoM, lot, package, owner, source/scrap locations,
  origin, date, picking, company, and chatter.
- `stock_scrap_views.xml:82-125` defines the mobile kanban and list fields.
- `stock_scrap_views.xml:127-140` defines `stock.action_stock_scrap`, named
  Scrap Orders, path `scraps`, with `list,form,kanban,pivot,graph` modes.
- `stock_scrap_views.xml:182-187` places `stock.menu_stock_scrap` under
  Inventory > Operations > Adjustments as Scrap.
- `addons/stock/models/stock_scrap.py:120-167` rejects deletion of Done rows;
  `do_scrap` creates the stock move/move line, completes it, writes Done and
  `date_done`, and optionally calls replenishment.

Authenticated comparison target: `http://127.0.0.1:8069/odoo/scraps`, user
`codex@core3.local`. The action rendered at both captured viewports; no write
was issued against Odoo.
