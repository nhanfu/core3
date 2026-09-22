# Odoo analysis

Source: /home/nhanjs/projects/odoo, Odoo 19 source revision 65975996.

- addons/stock/views/stock_orderpoint_views.xml:193-205 defines
  stock.action_orderpoint, named Reordering Rules, for
  stock.warehouse.orderpoint with list,kanban,form view modes and
  search_default_trigger: auto.
- addons/stock/views/stock_orderpoint_views.xml:70-160 defines the editable
  list/form fields: product, location, warehouse, on-hand, forecast,
  minimum/maximum quantities, trigger, unit, company, and replenishment
  controls.
- addons/stock/models/stock_orderpoint.py:21-104 defines the model,
  automatic trigger default, active archive flag, company/product/location
  fields, and uniqueness constraint.
- addons/stock/models/stock_orderpoint.py:252-308 validates min/max
  quantities, derives warehouse/location, prevents company changes, and
  prevents snoozing automatic rules.
- addons/stock/security/ir.model.access.csv:19-20 grants read access to stock
  users and full CRUD to stock managers; the multi-company rule is at
  addons/stock/security/stock_security.xml:126-130.

The supplied addon XML has the action record but no current XML menuitem
binding for stock.action_orderpoint; Core3's /reordering-rules path is
therefore recorded as a deliberate service route alias.
