# Source comparison

| Odoo capability | Core3 contract | Classification |
| --- | --- | --- |
| Actions menu `Duplicate` | `action_menu.actions` entry on `pages/invoice-detail.yaml` | implemented |
| `account.move.action_duplicate()` | `duplicate_accounting_invoice` / `accounting.invoices.duplicate` | implemented, bounded |
| `copy_data()` resets copy-disabled lifecycle fields | SQL creates a Draft with current dates, no reference/source links, and a restored amount due | implemented, bounded |
| `copy()` writes duplicate-origin chatter | `accounting_invoice_messages` insert records actor and source invoice | implemented |
| Odoo permission/access and create boundary | `accounting.write` plus actor and row-version guards | implemented, Core3-scoped |
| Odoo invoice line and relational graph copy | No line-table clone in this slice | deferred |
| Odoo sequence allocation and full computed-field engine | Deterministic `accounting-invoice-copy-*` identity and `(copy)` name | partial, explicitly documented |
