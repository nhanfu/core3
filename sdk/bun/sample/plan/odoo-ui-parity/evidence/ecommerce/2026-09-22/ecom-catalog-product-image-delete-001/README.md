# ECOM-CATALOG-PRODUCT-IMAGE-DELETE-001 evidence

Date: 2026-09-22

## Source and Core3 contract

- Odoo source: `addons/website_sale/models/product_image.py`,
  `views/product_views.xml`, and
  `static/src/website_builder/product_image_option_plugin.js`.
- Core3 page/API: `services/ecommerce/pages/product-detail.yaml` and
  `services/ecommerce/api/product-detail.yaml`, joined by
  `page.id: ecommerce-product-detail`.
- Persistence: migration `0.0.168` adds `row_version` to
  `ecommerce_product_images`.

## Browser evidence and blocker

- BrowserSkill instance: `245ea108`; the existing authenticated Odoo tab was
  listed but its borrow request did not transfer ownership and ended without a
  borrow result. The tab remained `scope: user`; no independent login or
  Playwright session was used.
- A BrowserSkill task tab rendered `http://localhost:8069/shop` as Odoo
  `Error 404` at desktop semantics `1916x833` and iPhone-14 semantics
  `390x844`. These are blocker captures only, not Product Detail action
  comparisons and not authenticated visual-parity proof.
- Captures remain at:
  `/tmp/core3-odoo-parity/ecommerce/2026-09-22/ecom-catalog-product-image-delete-001/odoo-shop-desktop.png`
  SHA-256 `9e67f0679a0d893573aafc671784a0414a8f6e99080a4928b8edc3535a68e3ad`
  and
  `/tmp/core3-odoo-parity/ecommerce/2026-09-22/ecom-catalog-product-image-delete-001/odoo-shop-mobile.png`
  SHA-256 `f16df7a8d73aca8a659cb28c05b6304829f690f8af46a3a588f204d19aa07ff8`.
- Core3 listeners were absent on ports `3000`, `3001`, `3012`, `4312`, and
  `4313`, so no Core3 desktop/mobile render was captured. No visual-parity
  claim is made.

## Verification

Focused test: `bun test ./test/ecommerce_product_image_delete.integration.test.ts --timeout 20000`

- 3 tests passed, 20 assertions, 0 failures.
- Covers Odoo source trace, page/API separation, Remove action declaration,
  upload/list/delete, stale/replay, foreign-company, inactive-product, and
  DuckDB restart behavior.
