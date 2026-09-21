INV-PACKAGE-BARCODE-001 verification

- Focused lifecycle: `bun test test/inventory_package_barcode.integration.test.ts` — PASS, 4 tests / 27 assertions.
- Related package regression: Packages, Package Transfers, Package Relocation, Package Remove, and this slice — PASS, 19 tests / 126 assertions. The package-transfer fixture expectation was repaired for the already-owned Package Remove relation introduced by migration 0.0.55.
- Authenticated Core3 browser evidence: admin desktop 1440x900 and mobile 390x844; package barcode action and persisted PDF report history present; bad responses and page errors empty; horizontal overflow false. Captures and `core3-browser.json` are in this directory.
- Odoo source comparison: PASS from `stock_package_views.xml`, `stock_report_views.xml`, and `report_package_barcode.xml`.
- Odoo live comparison: BLOCKED by HTTP 303 to `/web/login?redirect=%2Fweb%3F`; exact response is in `odoo-blocker.json`.
