# Source comparison

| Odoo behavior | Core3 before this slice | Core3 implementation |
| --- | --- | --- |
| Category cost warns when unsubmitted linked expenses exist | Category datasource exposed metadata only | `expense_categories` exposes draft count, total, and source-matched warning text |
| `standard_price` write updates linked draft expenses | Category edit changed only `expense_categories` | `edit_expense_category` updates current-company draft amounts using existing quantity |
| Zero-cost category keeps total and resets quantity to one | No linked expense side effect | Zero-cost update resets draft quantity and leaves amount unchanged |
| Product rename remains visible through linked expenses | Expense category was a denormalized string and was not relinked | Linked draft and non-draft rows receive the new category/product display name |
| Odoo mutation is manager controlled | Metadata/action permission existed but behavior was not tested | Action and datasource remain `expenses.manage`; stale/invalid writes are guarded |
| Dependent report totals follow draft changes | Sheet totals were not recalculated | Transaction recalculates affected `expense_sheets.amount_total` |
| Category action is list/kanban/form and product-backed | Core3 already provided list/kanban/shared forms | Page stays presentation-only and API joins by `page.id: expense-categories` |
