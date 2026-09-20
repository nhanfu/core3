# Reproducible verification

Focused command:

```text
bun test ./test/ecommerce_product_accessories.integration.test.ts --timeout 20000
```

Result: **3 passed, 27 assertions, 0 failures**.

Adjacent bounded regression result: **17 passed, 120 assertions, 0 failures**
across the accessory, Cart, Product Detail, Product Variant, and Product
Alternative suites.

The final bounded command also runs the adjacent Cart, Product Detail,
Product Variant, and Product Alternatives suites, followed by:

```text
bun scripts/audit-order-ui.ts
bunx eslint test/ecommerce_product_accessories.integration.test.ts test/ecommerce_cart.integration.test.ts
git diff --check
```

Audit result: **passed** — 693 pages, 702 routes, 1300 datasources. Scoped
ESLint and diff-check both passed.

The UI audit and diff-check are required commit gates. Odoo `/shop` and Core3
runtime blockers are documented in `browser-check.md`.
