# Odoo analysis

Local Odoo 19 source:

- `addons/hr_expense/views/hr_expense_views.xml:467-487` defines the
  `hr.expense` Activity view. Its card displays employee, expense name, and
  total amount.
- `addons/hr_expense/views/hr_expense_views.xml:489-495` defines My Expenses
  with view order `list,kanban,form,graph,pivot,activity`.
- `addons/hr_expense/data/mail_activity_type_data.xml:4-8` defines the
  Expense Approval activity type for `hr.expense`.
- `addons/hr_expense/models/hr_expense.py:43-48` inherits
  `mail.activity.mixin`, making scheduled activities durable Odoo records.

Live authenticated reference:

- URL: `http://localhost:8069`, database `core3_reference`, BrowserSkill
  browser instance `245ea108`.
- Desktop Activity view at 1916x833 showed the Odoo columns To-Do, Email, Call,
  Meeting, Expense Approval, and Document, with a `Schedule activity` footer.
- Mobile emulation at 390x844 also showed the same Activity matrix and footer;
  no horizontal overflow was observed in the captured viewport.
- The live seeded reference had no activity cards in this view, so the Core3
  deterministic scheduled-activity fixture is verified separately by tests.
