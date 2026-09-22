# EXPENSE-FUNC-017 source comparison

| Odoo source | Observed contract | Core3 before | Core3 after |
| --- | --- | --- | --- |
| `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:607-615` | `action_hr_expense_department_to_approve` is `Expense to Approve`, path `expense-to-approve`, scoped by `department_id`, with `list,kanban,form,pivot,graph` order and submitted default | Core3 department route had list, kanban, pivot, and graph only; the detail action existed only as row navigation | Core3 declares list, kanban, form, pivot, and graph in source order and keeps the existing submitted/department datasource scope |
| `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:97-312` | The shared `hr.expense` form is the form destination for the action | Core3 had the durable `expense-detail` page/API but no action-local form binding | `form_view: pages/expense-detail.yaml` uses the shared Odoo form contract with `side_panel: false` |
| `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:634-650` | The visible Expenses menu contains My Expenses, Reporting, Configuration, and the Accounting/Payables Employee Expenses entry; technical Activity Types is hidden | Core3 already represented the visible department approval handoff under My Expenses and kept technical activity types out of the menu | This slice changes only the department action view contract; no menu hierarchy or hidden technical entry is introduced |

No Odoo frontend code was copied. The page remains presentation-only; the
service-owned datasource and approval/refusal actions remain in
`api/to-approve.yaml`, joined by `page.id: expenses-to-approve`.
