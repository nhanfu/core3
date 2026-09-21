# INV-TRANSFER-EXCHANGE-001 evidence

- Focused integration: `bun test test/inventory_transfer_exchanges.integration.test.ts test/inventory_transfer_returns.integration.test.ts test/inventory_transfer_return_all.integration.test.ts test/inventory_transfer_workflow.integration.test.ts --timeout 20000` — PASS, 16 tests / 126 assertions.
- Coverage: page/API `page.id` join, Odoo source comparison, paired return/replacement transfer creation, deterministic persistence, migration replay, permission denial, company/missing/actor/stale/line/quantity/duplicate guards, and file-backed restart.
- Core3 browser: desktop and mobile reached `/auth/login`; captures are `core3-desktop-login.png` and `core3-mobile-login.png`. No authenticated visual sign-off is claimed.
- Odoo comparison: `GET http://127.0.0.1:8069/web` returned HTTP 303 to `/web/login?redirect=%2Fweb%3F`; no authenticated paired comparison is claimed.
- Scoped YAML audit: PASS; `transfer-detail` API/page definitions validate and share `page.id`.
- Repository-wide `bun run audit`: BLOCKED by an unrelated unstaged Employees action using unsupported `success_message` in `services/employees/api/employees.yaml`; no Employees file was changed.
