# INV-PRODUCT-REORDERING-001 verification

- `bun test test/inventory_product_reordering.integration.test.ts`: 3 tests,
  22 assertions passed.
- Coverage includes Odoo source/action mapping, page/API separation, product
  and template context filters, deterministic counts, company and empty
  boundaries, migration replay, and read-only permissions.
- `git diff --check`: passed for the checkout at verification time.
- The adjacent aggregate run also exercised the product-template, product-
  variant, and Reordering Rules suites. It was not accepted as a clean full
  baseline because concurrent unrelated CRM/base edits currently make global
  discovery fail on missing CRM activity/email actions; a later timeout was a
  failure cascade from that shared runtime state.
