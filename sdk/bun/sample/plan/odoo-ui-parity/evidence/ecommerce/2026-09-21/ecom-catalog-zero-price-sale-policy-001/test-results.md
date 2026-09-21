# Verification results

Run from `sdk/bun/sample` on 2026-09-21:

- `bun test test/ecommerce_zero_price_sale_policy.integration.test.ts
  --timeout 20000` — **3 passed, 32 assertions, 0 failures**.
- `bun test test/ecommerce_shop.integration.test.ts
  test/ecommerce_zero_price_sale_policy.integration.test.ts --timeout 20000`
  — **6 passed, 57 assertions, 0 failures**.
- Wave 21 paired page/API and Shop API YAML validation — passed.
- `bunx eslint test/ecommerce_zero_price_sale_policy.integration.test.ts` —
  passed with no warnings/errors.
- `git diff --check` — passed.
- Full `bun run audit` was attempted and is blocked outside Ecommerce by
  Inventory page references to undefined actions
  `print_inventory_transfer_operations` and
  `print_inventory_transfer_delivery_slip`.

The focused suite covers Odoo source/menu/settings pairing, deterministic
zero-price fixture behavior, read/update permissions, company and URL
validation, optimistic stale writes, authenticated and anonymous add-to-cart
guards, migration replay, and file-backed restart persistence.
