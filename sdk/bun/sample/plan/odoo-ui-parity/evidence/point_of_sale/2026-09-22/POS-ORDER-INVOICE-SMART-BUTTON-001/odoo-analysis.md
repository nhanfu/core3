# Odoo analysis

Source: Odoo 19 `point_of_sale` under `/home/nhanjs/projects/odoo`.

- `models/pos_order.py:722-741` defines `action_view_invoice()`.
  One linked `account.move` opens a `Customer Invoice` form; multiple linked
  moves open a `Customer Invoices` list/form action.
- `views/pos_order_view.xml:29-35` defines the form smart button labelled
  `Invoice`, hidden when `account_move` is empty. The header `Invoice` action at
  lines 10-11 is a separate create-invoice action and is visible for paid/done
  orders without an account move.
- Odoo grants POS users read access to `account.move` and its lines in
  `addons/point_of_sale/security/ir.model.access.csv`.

Authenticated live reference observations used browser instance `245ea108`,
database `core3_reference`, and `http://localhost:8069`:

- Orders showed four posted demo records, all with an empty Invoice Status.
- Opening `Furniture Shop - 000004` showed the create `Invoice` header action,
  `Return Products`, the Posted status, and no Invoice smart button because no
  `account_move` is linked.
- The positive linked-invoice state could not be exercised without changing
  the reference fixture; this is recorded as a data blocker, not a failed
  source comparison.
