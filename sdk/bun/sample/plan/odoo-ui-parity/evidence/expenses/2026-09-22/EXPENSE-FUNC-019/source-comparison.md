# EXPENSE-FUNC-019 source comparison

| Odoo source | Core3 contract | Result |
| --- | --- | --- |
| `addons/hr_expense/models/hr_expense.py:698-719` computes `same_receipt_expense_ids` from attachment checksums and excludes the current expense | `expense_detail.same_receipt_count` counts same-checksum expenses in the current company | Implemented |
| `addons/hr_expense/models/hr_expense.py:1275-1279` implements `action_show_same_receipt_expense_ids` with a records action | `view_same_receipt_expenses` navigates from the shared detail page to `/expenses/same-receipt` with the current expense ID | Implemented |
| `addons/hr_expense/views/hr_expense_views.xml:146` renders the same-receipt warning link in the expense form | `pages/expense-detail.yaml` exposes the permissioned View same receipt header action when `same_receipt_count > 0` | Implemented |
| Odoo reuses the expense list action for matching records | `pages/same-receipt.yaml` and `api/same-receipt.yaml` are joined by `page.id: expenses-same-receipt`, with read-only list/kanban and detail navigation | Implemented |

The Core3 query derives the checksum from the source expense ID, excludes the
source row, and enforces the current-company boundary.
