# EXPENSE-FUNC-020 source comparison

| Stable item | Odoo source | Core3 result |
| --- | --- | --- |
| Three dashboard cards | `get_expense_dashboard` | `pages/expenses.yaml` shared `StatRow` |
| To Submit | Draft state total | `expense_dashboard.to_submit` |
| Waiting Approval | Submitted state total | `expense_dashboard.waiting_approval` |
| Waiting Reimbursement | Approved + employee-paid total | `expense_dashboard.waiting_reimbursement` |
| Permission | Expenses user read access | `expenses.read` datasource permission |
| Company scope | Current company context | `current_company_name` predicate |
| Empty/error behavior | No rows / unavailable read | zero aggregate / `EXPENSE_DASHBOARD_UNAVAILABLE` |
