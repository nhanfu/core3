# EXPENSE-FUNC-014 source comparison

| Odoo source | Observed contract | Core3 before | Core3 after |
| --- | --- | --- | --- |
| `hr_expense/views/hr_expense_views.xml:585-605` | `Employee Expenses`, path `expenses-employee`, list/kanban/form/pivot/graph, approved/to-pay default context | Route existed with list/kanban only and no default scope | Page declares the same mode order, approved/to-pay scope, and shared form/detail navigation |
| `hr_expense/views/hr_expense_views.xml:3-65` | Employee/category/date/payment/tax/total/state list fields and optional columns | Basic employee expense fields only | API exposes stable total/tax/payment labels and corresponding columns |
| `hr_expense/views/hr_expense_views.xml:411-456` | Search/filter/group dimensions include payment, state, employee, category, date | No action-local status/payment filters | Page adds status/payment filters and employee/category/status/date group-by |

No Odoo frontend code was copied. The Core3 page remains presentation-only and
the datasource/actions remain service-owned.
