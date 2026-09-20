# INV-MOVE-REVERT-001 evidence

Wave 17 bounded Inventory slice: Revert Inventory Adjustment from Moves
History.

- Odoo source/action comparison: `source-comparison.json`; the bound action
  is `action_revert_inventory_adjustment` on `stock.move.line`, calling
  `action_revert_inventory()`.
- Core3 authenticated browser proof: `core3-browser.json`,
  `core3-desktop.png`, and `core3-mobile.png`. Desktop is 1440x900 and mobile
  is 390x844. Both show the manager-only action and reversal history state,
  returned HTTP 200 for the page source, had no page errors or failed
  requests, and had no horizontal overflow.
- Odoo live blocker: `odoo-blocker.json`; HTTP 303 redirected `/web` to
  `/web/login`, so no Odoo visual or mutation is claimed.

The browser proof captures the unsubmitted detail state. Durable reverse-move
creation, restart persistence, guards, and permission behavior are covered by
the focused integration test.
