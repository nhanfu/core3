# INV-PRODUCT-UPDATE-QUANTITY-001 evidence

- Focused integration: `bun test test/inventory_product_update_quantity.integration.test.ts` — 4 tests, 36 assertions, PASS.
- YAML/discovery audit: `bun run audit` — 746 pages, 755 routes, 1483 datasources, PASS.
- Browser probe: `core3-browser.json` plus `desktop.png` and `mobile.png`. Both requested desktop/mobile routes returned the login shell at `/auth/login`; no authenticated visual pass is claimed. No page errors, HTTP 4xx/5xx responses, or horizontal overflow were observed in the login shell.
- Odoo paired comparison: BLOCKED by HTTP 303 to `/web/login?redirect=%2Fweb%3F`; exact response is in `odoo-blocker.json`.
