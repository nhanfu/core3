# Odoo source analysis

- Revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).
- Model source: `/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model.py`.
- View source: `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml`.
- The model form button is `action_model_vehicle`, labeled `Vehicles`, and
  displays `vehicle_count`.
- `action_model_vehicle()` returns `fleet.vehicle`, sets
  `default_model_id=self.id`, and, when vehicles exist, sets
  `search_default_model_id=self.id` with `kanban,list,form` modes.

The missing behavior was not a missing button declaration. Core3 had a
navigation event using the model display name, but the `/vehicles` datasource
had no model predicate, so the selected model did not constrain the returned
rows.
