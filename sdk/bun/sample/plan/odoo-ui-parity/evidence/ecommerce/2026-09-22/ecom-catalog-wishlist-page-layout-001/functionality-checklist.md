# Functionality checklist

| Case | Class | Result | Evidence |
| --- | --- | --- | --- |
| `ECOM-FUNC-090` Odoo model, builder, template, stylesheet trace | functional | pass | `odoo-analysis.md`, `source-comparison.md` |
| `ECOM-WF-090` default/update layout state | workflow | pass | `test-results.md` |
| invalid desktop/mobile/gap values | security | pass | `test-results.md` |
| foreign company and stale row-version writes | permission | pass | `test-results.md` |
| missing fixture read and idempotent migration replay | data | pass | `test-results.md` |
| Wishlist page projection after update | integration | pass | `test-results.md` |
| DuckDB close/reopen persistence | regression | pass | `test-results.md` |
| authenticated Odoo desktop/mobile visual comparison | visual/responsive | blocked | `verification.md`, browser captures |
| authenticated Core3 desktop/mobile capture | visual/responsive | blocked | `verification.md` |

The slice does not alter wishlist item ownership, add/remove, or session-merge
workflow; those regressions are covered by the adjacent test run.
