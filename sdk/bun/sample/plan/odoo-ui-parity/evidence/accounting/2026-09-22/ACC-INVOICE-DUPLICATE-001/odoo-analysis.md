# Odoo analysis

Inspected local Odoo 19 source before editing:

- `addons/account/models/account_move.py:6050-6058` defines
  `action_duplicate()`, calls `self.copy()`, and opens the copied entry form.
- `addons/account/models/account_move.py:3796-3815` defines `copy_data()`;
  invoice lines are recreated and copy-disabled fields such as name, date,
  state, invoice date, and due date are not copied.
- `addons/account/models/account_move.py:3817-3827` defines `copy()` and logs
  the duplicate-origin message using `_get_copy_message_content()` at
  `3829-3835`.
- `addons/account/views/account_move_views.xml:701-796` identifies the
  Account Entry form whose Actions menu exposes the generic Duplicate action.

BrowserSkill inspected the active Odoo service at
`http://localhost:8069/odoo/invoicing/10` in the `core3_reference` authenticated
context without reading or printing credentials. The observed posted invoice
`INV/2026/00008` showed the Actions menu with `Duplicate`, `Delete`, Generate a
Payment Link, Share, Switch into invoice/credit note, Pay, and (Un)Block
Payment. This is reference evidence only; it is not a paired Core3 visual
comparison.
