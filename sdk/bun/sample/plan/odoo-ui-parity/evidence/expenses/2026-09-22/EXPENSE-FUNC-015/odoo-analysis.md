# EXPENSE-FUNC-015 Odoo analysis

Local Odoo source identifies `hr.expense.action_open_account_move` at
`/home/nhanjs/projects/odoo/addons/hr_expense/models/hr_expense.py:1351-1367`.
It opens the linked `account.move` form for employee-paid expenses and the
originating `account.payment` form for company-paid expenses.

The Expense form smart buttons at
`/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:149-166`
expose the Journal Entry destination to accounting users. This is a detail
action, not an activity or analytics view.

BrowserSkill instance `245ea108` was connected, but the authenticated Odoo
user tab was already borrowed by session `wbjh`. The borrow command returned
the exact blocker `tab is borrowed by another session`; no Odoo DOM was read.
