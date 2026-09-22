# Odoo analysis

- Source revision: `659759969d535d286b656c96b675e4612b925ddd`.
- Source view: `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml`.
- Odoo form field: `state_id`, model `fleet.vehicle.state`, widget `statusbar`,
  options `{'clickable': '1'}`.
- Vehicle access CSV grants Fleet officers read/write/create/unlink on
  `fleet.vehicle`; status records are read-only for officers.
- The field is a direct vehicle state write and is separate from the named
  Apply New Driver and vehicle operational buttons.
