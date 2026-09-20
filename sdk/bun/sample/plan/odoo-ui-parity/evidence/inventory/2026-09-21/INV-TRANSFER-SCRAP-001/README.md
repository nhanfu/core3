# INV-TRANSFER-SCRAP-001 evidence

Wave 16 bounded Inventory slice: transfer-bound Scrap wizard/action.

- Odoo source/menu/action comparison: `source-comparison.json`; source is
  `addons/stock/views/stock_picking_views.xml:502-511`, server action
  `stock.action_scrap` on `stock.picking`, form-bound, calling
  `records.button_scrap()`.
- Core3 authenticated browser proof: `core3-browser.json`,
  `core3-desktop.png`, and `core3-mobile.png`. Desktop is 1440x900 and mobile
  is 390x844. Both rendered the transfer detail Scrap action, returned HTTP
  200 for the page source, had no page errors or failed requests, and had no
  horizontal overflow.
- Odoo live blocker: `odoo-blocker.json`; HTTP 303 redirected `/web` to
  `/web/login`, so no Odoo visual or mutation is claimed.

The browser proof intentionally captures the unsubmitted wizard/history state;
the durable create/restart/permission lifecycle is covered by the focused
integration test.
