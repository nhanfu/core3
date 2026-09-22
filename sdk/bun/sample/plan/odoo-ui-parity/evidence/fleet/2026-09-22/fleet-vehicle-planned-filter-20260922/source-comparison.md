# Source comparison

| Odoo contract | Core3 implementation | Result |
| --- | --- | --- |
| Search filter `planned`, label `Planned for Change` | `pages/vehicles.yaml` filter `planned` | Implemented |
| Bike planned domain uses `plan_to_change_bike` | `fleet_vehicles` datasource predicate | Implemented |
| Car planned domain uses `plan_to_change_car` | `fleet_vehicles` datasource predicate | Implemented |
| Vehicle list read is Fleet-user accessible | Page/API remain `fleet.read` | Implemented |
| Apply New Driver clears plan flags after promotion | Existing `action_accept_driver_change` mutation clears both flags | Implemented |
| Deterministic state and replay | Migrations 053/054 add/backfill flags and seed City Bike 02 | Implemented |
| Authenticated Odoo desktop/mobile screen | `core3_reference` route resolved to Discuss/OdooBot | Blocked; no visual claim |
