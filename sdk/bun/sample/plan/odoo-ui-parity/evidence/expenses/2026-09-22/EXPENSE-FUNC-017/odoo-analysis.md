# EXPENSE-FUNC-017 Odoo analysis

The relevant installed-addon inventory is:

- `Expenses > My Expenses > Expense to Approve` is the department integration
  action `action_hr_expense_department_to_approve`; its source view order is
  `list,kanban,form,pivot,graph`, its domain is the active department, and its
  default state is `submitted`.
- The same `hr.expense` form used by the ordinary expense actions is the form
  destination. Its state-specific receipt, approval, refusal, split, activity,
  and accounting controls are already owned by Core3's `expense-detail`
  page/API contracts and are not duplicated here.
- The ordinary visible menu inventory remains `My Expenses` (My Expenses and
  Expenses to Process), `Reporting` (Expenses Analysis), `Configuration`
  (Expense Categories and system-only Settings), plus Accounting/Payables'
  `Employee Expenses`. The `Activity Types` menu is `base.group_no_one` and
  remains intentionally hidden.

The bounded gap was the missing Form mode declaration and action-local binding,
not a new persistence model. Core3 already had stable department rows,
permissioned detail navigation, receipt-gated approval, reasoned refusal,
empty/error states, and durable activity/workflow data.

BrowserSkill comparison was attempted on Chrome instance `245ea108`, but the
required authenticated Odoo tab `1770662590` was already borrowed by session
`yabv`. The borrow command returned `tab is borrowed by another session`; no
Odoo DOM was read and no desktop/mobile screenshot was captured.
