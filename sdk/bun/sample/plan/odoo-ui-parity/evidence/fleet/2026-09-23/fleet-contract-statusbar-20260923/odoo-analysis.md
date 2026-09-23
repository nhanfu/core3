# Odoo source analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

- View: `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_cost_views.xml`
  record `fleet_vehicle_log_contract_view_form` declares `state` with
  `widget="statusbar" options="{'clickable': '1'}"`.
- Model: `/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_log_contract.py`
  defines `action_draft`, `action_open`, `action_expire`, and `action_close`.
- The Odoo state values are `futur` (New), `open` (Running), `expired`
  (Expired), and `closed` (Cancelled). Core3 uses the visible labels as its
  stable contract status values.

This is a statusbar action binding, not a new menu, datasource, or migration.
