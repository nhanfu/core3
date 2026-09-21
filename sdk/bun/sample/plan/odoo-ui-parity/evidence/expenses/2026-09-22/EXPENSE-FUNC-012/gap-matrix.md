# Gap matrix

| Stable ID | Gap before slice | Bounded change | Persistence/permission | Evidence |
| --- | --- | --- | --- | --- |
| EXPENSE-FUNC-012-A | Category cost was metadata-only | Propagate non-zero cost to current-company draft expenses using quantity | Atomic YAML mutation, `expenses.manage`, row versions | `expenses_category_cost.integration.test.ts` |
| EXPENSE-FUNC-012-B | Category rename did not update denormalized labels | Relink category and product display names for linked expenses | Same transaction; non-draft amounts unchanged | `expenses_category_cost.integration.test.ts` |
| EXPENSE-FUNC-012-C | No Odoo warning/count contract | Add draft count/total and warning metadata to service datasource and edit form | Read/write remain manager-scoped | Contract test and Odoo capture |
| EXPENSE-FUNC-012-D | No cost-update migration/index | Add idempotent category/state/company index and replay assertion | Migration `0.0.14`; no duplicate seed rows | `expenses_migrations.integration.test.ts` |

Deferred: full Odoo product image/tax/account widgets, exact 1440x900
category-detail comparison, and authenticated Core3 browser interaction because
the local Core3 runtime was not listening during this wave.
