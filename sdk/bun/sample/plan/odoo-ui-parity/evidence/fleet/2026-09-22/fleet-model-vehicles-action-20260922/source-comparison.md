# Source comparison

| Contract | Odoo | Core3 result |
| --- | --- | --- |
| Form action | `action_model_vehicle` on `fleet.vehicle.model` | `view_fleet_model_vehicles` on `model-detail` |
| Target | `fleet.vehicle` | `/vehicles` |
| Scope | `search_default_model_id=self.id` | `model_id={state.fleet_model_detail.id}` |
| Durable relation | Odoo relational `model_id` | `fleet_vehicle_model_rel(vehicle_id, model_id)` |
| Read permission | Fleet user model access | `fleet.read` on the navigation and datasource |
| Empty/missing selection | Odoo action returns no matching vehicle rows | Unknown model and explicit empty fixture return `[]` |
| Transport failure | Web client transport error | `503 FLEET_VEHICLES_UNAVAILABLE` |
| Responsive visual proof | Required by plan | Blocked by shared-tab ownership; no parity claim |
