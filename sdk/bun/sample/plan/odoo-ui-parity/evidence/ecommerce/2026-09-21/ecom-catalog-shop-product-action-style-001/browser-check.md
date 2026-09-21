# Browser and Odoo checks

- Core3 authenticated desktop/mobile capture: Playwright CLI opened the
  target and received `net::ERR_CONNECTION_REFUSED`; ports 3000/4312/4313
  have no listener. No screenshots or rendered UI sign-off are claimed.
- Odoo authenticated comparison: Playwright CLI opened
  `http://127.0.0.1:8069/shop`, title `Odoo`, HTTP status `404 NOT FOUND`.
  The exact probes on ports 8069 and 8073 both return HTTP 404, so the paired
  authenticated Products Design Panel comparison cannot be completed.
- Source comparison is exact against the supplied Odoo model, builder
  plugin, builder view, and product-tile stylesheet; this does not substitute
  for browser evidence.
