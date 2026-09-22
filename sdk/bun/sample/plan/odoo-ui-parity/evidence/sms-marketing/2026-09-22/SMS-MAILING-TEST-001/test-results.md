# Test results

Focused command:

```text
cd sdk/bun && bun test ./sample/test/sms_marketing_mailing_test.integration.test.ts --timeout 20000
```

Result: **pass**, 4 tests, 19 expectations, 0 failures.

Also passed:

- `bunx eslint sample/test/sms_marketing_mailing_test.integration.test.ts`
- SMS Marketing Sass compilation
- `git diff --check`

The full SMS glob reached 37 passing tests and 5 discovery failures from the
unrelated existing global schema error in
`sample/services/inventory/pages/product-template-detail.yaml`: stat button 6
`view_inventory_product_template_storage_capacities` lacks `value_field`.
That out-of-scope Inventory file was not edited.
