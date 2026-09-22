# Source comparison

| Odoo contract | Core3 bounded implementation | Result |
| --- | --- | --- |
| action_model_vehicle sets default_model_id=self.id | create_fleet_vehicle_for_model passes default_model_id from model detail state | Implemented |
| Non-zero models open the filtered Vehicles action | Existing view_fleet_model_vehicles remains read-scoped and passes model/default context | Implemented |
| Zero-count models open a Vehicle form | Conditional New Vehicle stat action opens YAML server_form | Implemented |
| Vehicle creation persists the selected model relation | fleet_vehicle_model_rel insert and fleet_vehicle_models.vehicle_count update are one mutation transaction | Implemented |
| Model-derived vehicle type/name/manufacturer | Transactional post-insert initialization reads the selected model and brand | Implemented |
| Fleet officer create access | Action permission is fleet.write; model read remains fleet.read | Implemented |
| Archived/missing/stale/duplicate/invalid/company failures | Explicit 404/403/409/422 guards | Implemented |
| Authenticated desktop/mobile Odoo comparison | Requested tab was already borrowed by another BrowserSkill session | Blocked; no visual claim |
