# EXPENSE-FUNC-020 Odoo analysis

- Source: `/home/nhanjs/projects/odoo/addons/hr_expense/models/hr_expense.py:1282-1314`.
- Odoo initializes dashboard cards named `To Submit`, `Waiting Approval`, and
  `Waiting Reimbursement`.
- The dashboard reads the current user's employee expenses and groups by state.
  `Waiting Reimbursement` is only approved expenses paid by the employee
  (`payment_mode = own_account`).
- Source view search filters confirm the same domains at
  `hr_expense_views.xml:430-432`.
- BrowserSkill observation of the authenticated `core3_reference` service at
  `http://localhost:8069/odoo/expenses` showed all three cards above the table
  and the five source view tabs at 1916x833.
