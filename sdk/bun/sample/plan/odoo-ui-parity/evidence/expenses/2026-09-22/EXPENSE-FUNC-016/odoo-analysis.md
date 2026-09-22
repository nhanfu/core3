# EXPENSE-FUNC-016 Odoo analysis

Local Odoo 19 source:

- `addons/hr_expense/views/hr_expense_views.xml:126-130` exposes `Split
  Expense` only for draft expenses whose product has no non-zero cost.
- `addons/hr_expense/wizard/hr_expense_split_wizard_views.xml:8-58` defines
  the wizard warning, editable lines, Product, Employee, Taxes, Tax amount in
  Currency, Analytic Distribution, Total In Currency, Original Amount, Taxes,
  Split Expense, and Cancel controls.
- `addons/hr_expense/wizard/hr_expense_split_wizard.py:35-55` computes split
  and tax totals and disables the action until at least two lines total to the
  original amount.
- `addons/hr_expense/wizard/hr_expense_split.py:19-117` carries product,
  employee, tax, analytic, amount, and approval metadata into each split.
- `addons/hr_expense/wizard/hr_expense_split_wizard.py:57-91` updates the
  first expense, copies remaining expenses, and copies the source receipt
  attachments to each copied expense.

The existing Core3 split contract in
`services/expenses/api/expense-detail.yaml` already had durable line CRUD,
row-version guards, exact-total validation, and stable split relations. It did
not expose tax totals in the wizard/line presentation, enforce the product-cost
visibility guard, propagate the first line tax amount, or copy attachments to
the generated child expenses. Those are the bounded gaps implemented here.

BrowserSkill reference attempt:

- Browser instance: `245ea108`.
- Required authenticated tab: `1770662590`.
- `bsk tab borrow` returned `tab is borrowed by another session`, owner
  session `cqvt`.
- No live DOM was read and no new live desktop/mobile capture was produced.
  The prior truthful source reference remains outside Git at
  `/tmp/odoo-expenses-review-split-20260911/odoo-split-desktop-1440x900.png`;
  it is not treated as a current-wave capture.
