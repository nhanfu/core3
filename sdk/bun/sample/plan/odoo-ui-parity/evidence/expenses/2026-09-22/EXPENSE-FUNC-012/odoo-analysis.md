# Odoo analysis

Source addon: `hr_expense`, Odoo 19 Community (`19.0.2.1` in the parity plan).

- `/home/nhanjs/projects/odoo/addons/hr_expense/models/product_product.py`
  computes `standard_price_update_warning` from draft `hr.expense` records and
  updates only draft expenses when `standard_price` is written. A non-zero cost
  replaces the draft unit price while preserving quantity; a zero cost resets
  quantity to one and preserves the current total amount.
- `/home/nhanjs/projects/odoo/addons/hr_expense/views/product_product_views.xml`
  defines the manager Expense Categories action with `list,kanban,form`, Cost,
  warning alert, Reference, Guideline, supplier taxes, and the
  `can_be_expensed` domain.
- `/home/nhanjs/projects/odoo/addons/hr_expense/models/product_template.py`
  defines the stored `can_be_expensed` product flag and its constraints.

Authenticated live observation on 2026-09-22 at
`http://localhost:8069`, database `core3_reference`, loaded
`Expenses -> My Expenses` and `Expenses -> Configuration -> Expense Categories`.
The reference showed List/Kanban/Graph/Pivot/Activity views, receipt upload,
expense rows/statuses, and category Cost, Reference, Note, Purchase Taxes, and
Re-Invoice Costs fields. No live record was mutated.
