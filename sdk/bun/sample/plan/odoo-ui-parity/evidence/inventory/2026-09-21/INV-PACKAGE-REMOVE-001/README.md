# INV-PACKAGE-REMOVE-001 evidence

Wave 18 bounded Inventory slice: Remove a package from an open transfer.

- Odoo source/action comparison: `source-comparison.json`; the deferred
  editable transfer-pack action is `action_remove_package` on `stock.package`.
- Core3 authenticated browser proof: `core3-browser.json`,
  `core3-desktop.png`, and `core3-mobile.png`. Desktop is 1440x900 and mobile
  is 390x844. Both show the Remove from Transfer action and removal history
  state, returned HTTP 200 for the page source, had no page errors or failed
  requests, and had no horizontal overflow.
- Odoo live blocker: `odoo-blocker.json`; HTTP 303 redirected `/web` to
  `/web/login`, so no Odoo visual or mutation is claimed.

The browser proof captures the unsubmitted action/history state. Durable
relation removal, actor/context guards, restart persistence, and permission
behavior are covered by the focused integration test.
