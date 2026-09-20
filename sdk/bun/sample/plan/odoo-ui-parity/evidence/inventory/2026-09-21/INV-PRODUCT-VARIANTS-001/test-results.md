# Product Variants bounded verification

- `bun test ./test/inventory_product_variants.integration.test.ts --timeout 20000`
  — PASS, 4 tests / 29 assertions.
- `bun run audit` — PASS, 708 pages, 717 routes, 1,349 datasources.
- `bunx eslint test/inventory_product_variants.integration.test.ts` — PASS.
- `git diff --check -- sdk/bun/sample/services/inventory sdk/bun/sample/test/inventory_product_variants.integration.test.ts`
  — PASS.
- Authenticated Core3 browser probe — PASS for desktop 1440x900 and mobile
  390x844 list/detail states; mobile also renders the New Product Variant form.
  Document/body widths equal the viewport and no console errors or HTTP >=400
  responses were observed. The app notification poll abort is recorded in
  `browser-results.json` as an unrelated `ERR_ABORTED` request.
- Odoo browser probe — authentication succeeds at both viewports, but
  `/odoo/action-434` redirects to `/odoo/discuss`; no Product Variants menu,
  form, or mutation is claimed.
