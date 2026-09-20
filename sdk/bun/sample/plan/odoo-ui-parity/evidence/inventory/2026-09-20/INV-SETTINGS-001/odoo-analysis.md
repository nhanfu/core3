# Odoo analysis

Source reviewed: `/home/nhanjs/projects/odoo/addons/stock/views/res_config_settings_views.xml`
and `/home/nhanjs/projects/odoo/addons/stock/models/res_company.py`.

- Menu path: Inventory → Configuration → Settings.
- Action XMLID: `stock.action_stock_config_settings`, an `ir.actions.act_window`
  for `res.config.settings` in form mode.
- Menu XMLID: `stock.menu_stock_general_settings`, parent
  `stock.menu_stock_config_settings`, action `action_stock_config_settings`,
  restricted by `base.group_system`.
- Inventory app and setting visibility: `stock.group_stock_manager`.
- Setting source contract: `annual_inventory_day` is an Integer with default 31;
  `annual_inventory_month` is a January–December selection with default `'12'`.
  Odoo exposes both as editable related company settings under the label
  “Annual Inventory Day and Month”.
- Core3 comparison route: `/inventory/settings`, manager permission
  `inventory.manage`, with a server mutation for the persisted settings row.

Authenticated paired capture used the supplied Odoo reference route
`/odoo/action-445` at 1440x900 and 390x844. The action authenticated but returned
an Odoo RPC error before rendering the Settings form; the exact traceback is
preserved in `odoo.json` and summarized in `verification.md`.
