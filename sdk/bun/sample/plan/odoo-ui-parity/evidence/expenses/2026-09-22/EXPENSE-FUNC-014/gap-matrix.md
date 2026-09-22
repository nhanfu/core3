# EXPENSE-FUNC-014 gap matrix

| Stable gap | Required behavior | Implementation | Evidence |
| --- | --- | --- | --- |
| `EXPENSE-FUNC-014-VIEWS` | Employee Expenses exposes list, kanban, form, pivot, graph in Odoo order | `pages/employee-expenses.yaml` uses shared ListView modes; existing detail route is the form destination | Focused test |
| `EXPENSE-FUNC-014-SCOPE` | Default action shows approved expenses and posted employee-paid reimbursement candidates | API scope `approved_to_pay`; page default filter is deterministic | Focused test |
| `EXPENSE-FUNC-014-FILTERS` | Status and payment-mode filters, search, stable ordering | API lookup sources and parameter guards | Focused test |
| `EXPENSE-FUNC-014-STATES` | Explicit empty and transport-error behavior | Search can return empty; source declares 503 error state | Focused test |
| `EXPENSE-FUNC-014-PERM` | Read action is protected by Expenses read permission | Page auth and datasource both require `expenses.read` | Contract inspection |
| `EXPENSE-FUNC-014-VISUAL` | Authenticated desktop/mobile comparison | Blocked: signed-in tab borrow did not transfer | No visual claim |
