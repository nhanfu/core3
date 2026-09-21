# INV-LOCATION-BARCODE-001 evidence

- Focused integration: `bun test test/inventory_location_barcode.integration.test.ts --timeout 20000` — PASS, 4 tests / 29 assertions.
- Coverage: page/API `page.id` join, Odoo source comparison, deterministic PDF report history, idempotent migration, missing/company/actor/company-mismatch/stale guards, read-permission denial, and file-backed restart persistence.
- Core3 browser: desktop and mobile reached `/auth/login`; captures are `core3-desktop-login.png` and `core3-mobile-login.png`. No authenticated visual sign-off is claimed.
- Odoo comparison: `GET http://127.0.0.1:8069/web` returned HTTP 303 to `/web/login?redirect=%2Fweb%3F`; no authenticated paired comparison is claimed.
