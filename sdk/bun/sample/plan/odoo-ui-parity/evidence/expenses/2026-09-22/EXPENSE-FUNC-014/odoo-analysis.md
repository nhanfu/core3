# EXPENSE-FUNC-014 Odoo analysis

Local source inspection identified `action_hr_expense_account` as the next
non-activity, non-My-Expenses action gap. The action is available from
Accounting/Payables as `Employee Expenses`, uses the `hr.expense` model, and
has `list,kanban,form,pivot,graph` view order. Its context enables
`all_approved` and `all_to_pay`; the search view defines these as approved
expenses and posted employee-paid expenses respectively. The list source also
includes total amount, taxes, payment mode, activity, and state.

The live reference could not be read during this run. BrowserSkill status
reported a connected Chrome instance `245ea108`; the existing user tab was
listed, but the borrow request did not transfer it. The agent window remained
`about:blank` and was stopped. This is recorded as an evidence blocker, not as
an inferred visual result.
