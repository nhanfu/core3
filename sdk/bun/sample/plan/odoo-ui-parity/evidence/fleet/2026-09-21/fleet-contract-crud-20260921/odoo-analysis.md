# Odoo analysis

Source revision: `/home/nhanjs/projects/odoo` at `65975996`, addon
`addons/fleet`.

- `models/fleet_vehicle_log_contract.py:9-13` defines
  `fleet.vehicle.log.contract`, inheriting mail thread/activity behavior.
- `models/fleet_vehicle_log_contract.py:20-65` defines the required vehicle
  relation, active/archive state, dates, status selection, recurring cost, and
  notes.
- `models/fleet_vehicle_log_contract.py:104-133` recomputes date-driven state
  and provides close, draft, open, and expire actions.
- `views/fleet_vehicle_cost_views.xml:3-63` defines the editable contract form,
  statusbar, archive ribbon, and chatter.
- `views/fleet_vehicle_cost_views.xml:65-91` defines the editable list with
  warning/state decorations.
- `views/fleet_vehicle_cost_views.xml:184-203` defines
  `fleet_vehicle_log_contract_action`, menu visibility, and the
  `list,kanban,form,graph,pivot,activity` order with open-by-default context.
- `security/ir.model.access.csv:9,19` grants Fleet users and managers read,
  write, create, and delete access to contract logs.

Live browser audit on 2026-09-21 used the already authenticated shared Chrome
profile on browser instance `245ea108`, own bsk session `lnqg`, at
`http://localhost:8069/odoo`. The app launcher had no Fleet entry and direct
`/odoo/fleet` returned to Discuss. This is an environment blocker, so no live
Fleet labels or records are treated as verified.
