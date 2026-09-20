# INV-STOCK-LOCATIONS-001 blockers

- Core3 authenticated desktop/mobile evidence is complete in `browser.json`
  and the six Core3 PNG captures. The isolated runtime was
  `http://127.0.0.1:4318`; both viewports show the Stock row entry, product
  location row, report history, and refresh result with no failed requests,
  page errors, or horizontal overflow.
- Paired authenticated Odoo Stock report evidence is in `odoo-browser.json`
  and `odoo-desktop.png` / `odoo-mobile.png`. Odoo rendered
  `/odoo/stock-report` at both viewports with no failed requests, but the
  supplied authenticated user did not expose a `Locations` button: the source
  button is restricted by `stock.group_stock_multi_locations` at
  `product_views.xml:589-590`. Therefore no Odoo Locations detail screenshot
  or mutation was possible in this bounded wave.
- This is an exact source-permission blocker, not a Core3 failure. No Odoo
  data was changed and no full Inventory sign-off is claimed.
