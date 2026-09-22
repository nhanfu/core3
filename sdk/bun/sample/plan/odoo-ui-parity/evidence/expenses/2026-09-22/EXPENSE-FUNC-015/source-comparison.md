# EXPENSE-FUNC-015 source comparison

| Odoo source | Observed contract | Core3 before | Core3 after |
| --- | --- | --- | --- |
| `hr_expense/models/hr_expense.py:1351-1367` | Resolve the linked accounting move or originating payment and open its form | Expense detail showed only `journal_entry` text; no durable target or action | `expense_accounting_links` stores typed target ID/route and the API exposes it through `expense_accounting_link` |
| `hr_expense/views/hr_expense_views.xml:149-166` | Smart button is visible only when an accounting document exists and requires accounting visibility | No accounting smart button | Journal Entry and Payment smart buttons use shared form stat-button contracts with `accounting.read` |
| Odoo accounting form destinations | Move and payment open as form records | No cross-module destination from Expenses | Existing `/accounting/journal-entry-detail` and `/accounting/payment-detail` routes are used; Accounting files remain unchanged |

No Odoo frontend code was copied. The page remains presentation-only and the
datasource/actions remain in the Expenses API fragment joined by `page.id`.
