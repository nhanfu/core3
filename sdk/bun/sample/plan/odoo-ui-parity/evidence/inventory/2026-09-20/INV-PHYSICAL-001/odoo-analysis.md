# Odoo analysis

Source inspected in the local Odoo checkout:

- `addons/stock/views/stock_quant_views.xml:4-21` defines the
  `stock.action_view_inventory_tree` server action and its `physical-inventory`
  path; line 361 defines `menu_action_inventory_tree` under stock adjustments.
- `stock_quant_views.xml:229-270` defines the editable Physical Inventory list,
  its Apply All action, counted quantity/difference fields, and history affordance.
- `addons/stock/wizard/stock_inventory_adjustment_name.xml:3-31` defines the
  reason/counting-date wizard and Update Quantities/Discard controls.
- `addons/stock/models/stock_quant.py:402-468` implements apply/set/clear
  behavior; `addons/stock/wizard/stock_inventory_adjustment_name.py:8-22`
  filters `inventory_quantity_set` quants and forwards the wizard context.

The authenticated Odoo desktop and mobile captures show the source list and
responsive surface at `/odoo/physical-inventory`. No Odoo write was performed;
Core3 behavior is compared in `source-comparison.md`.
