# Odoo analysis

- Addon: `hr_expense`, Odoo 19 Community.
- Model: `hr.expense`.
- Source: `/home/nhanjs/projects/odoo/addons/hr_expense/models/hr_expense.py`.
- Views: `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml`.
- Live URL/database: `http://localhost:8069`, `core3_reference`.

`hr.expense` inherits `mail.activity.mixin`. The list includes `activity_ids`
with the `list_activity` widget. The addon defines a dedicated Activity view
and includes `activity` in the My Expenses action's
`list,kanban,form,graph,pivot,activity` view order. The live authenticated list
shows activity indicators alongside seeded expenses; desktop and mobile
captures are paired below.
