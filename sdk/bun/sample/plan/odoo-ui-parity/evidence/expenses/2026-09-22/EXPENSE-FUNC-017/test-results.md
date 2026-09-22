# EXPENSE-FUNC-017 test results

Focused command (first invocation before unrelated concurrent discovery edits):

```text
3 pass, 0 fail, 14 expect() calls
```

The test covers the `page.id` page/API join, exact Odoo view order, shared
Form-mode binding, row-open actions, department scope, stable ordering, empty
search, transport error, receipt-required approval, and manager permission
metadata. The merged Expenses page/API YAML also validates directly.

The later full corpus ran 60 tests with 51 passing and 9 discovery-phase
failures. A focused rerun then hit the same unrelated global discovery blocker:
Purchase's `upload_purchase_bill` action is referenced but not defined. Two
non-discovery assertions in the focused file still passed. This Expenses slice
does not modify the Purchase files.

`bun run css:build:expenses`, `bun run frontend:build`, and `git diff --check`
passed. `bun run audit` is blocked by the same global discovery defect.
