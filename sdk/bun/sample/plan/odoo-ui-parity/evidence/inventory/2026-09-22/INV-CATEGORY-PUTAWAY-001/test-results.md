# Test results

Focused command:

```text
bun test test/inventory_product_category_putaway.integration.test.ts --timeout 30000
```

Result: 3 tests passed, 15 assertions, 0 failures.

Coverage includes Odoo source/action mapping, page/API ownership, stat count,
category filtering, empty/company boundaries, migration replay, and file-backed
restart persistence.

Adjacent checks:

- Product Categories: 4 tests passed.
- Product Putaway Rules: 3 tests passed.
- Existing global Putaway Rules suite: 3 tests passed and 1 discovery test
  failed on the pre-existing repository-wide page-schema error
  `actions[5].success_message is not allowed` from unrelated Inventory action
  definitions. The feature suite does not introduce `success_message`.
- `git diff --check` is run at handoff; authenticated browser evidence remains
  blocked.
