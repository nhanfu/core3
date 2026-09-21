# INV-TRANSFER-RETURN-ALL-001 evidence

- Focused integration: `bun test test/inventory_transfer_return_all.integration.test.ts test/inventory_transfer_returns.integration.test.ts test/inventory_transfer_workflow.integration.test.ts` — 12 tests, 100 assertions, PASS.
- YAML/discovery audit: `bun run audit` — 747 pages, 756 routes, 1490 datasources; PASS.
- Scoped lint: `bunx eslint test/inventory_transfer_return_all.integration.test.ts test/inventory_transfer_returns.integration.test.ts test/inventory_transfer_workflow.integration.test.ts` — PASS.
- Diff check: `git diff --check` — PASS.
- Browser probe: `core3-browser.json` plus `desktop.png` and `mobile.png`. Both requested desktop/mobile routes returned the login shell at `/auth/login`; no authenticated visual pass is claimed. No page errors, HTTP 4xx/5xx responses, or horizontal overflow were observed in the login shell.
- Odoo paired comparison: BLOCKED by HTTP 303 to `/web/login?redirect=%2Fweb%3F`; exact response is in `odoo-blocker.json`.
