# Source comparison

| Odoo source contract | Core3 bounded implementation | Result |
| --- | --- | --- |
| `fleet.vehicle.model.vendors` is a `res.partner` many-to-many field | Fleet-owned vendor contact projection plus `fleet_vehicle_model_vendors` relation | Implemented within the Fleet service boundary |
| Model form has a Vendors notebook page with contact cards | `model-detail` keeps the Vendors tab/summary and adds an Odoo-style vendor `LineItemGrid` | Implemented |
| Vendors can be assigned and removed from a model | `add_fleet_model_vendor` and `remove_fleet_model_vendor` YAML actions | Implemented |
| Model and vendor relation must be durable | Migrations `0.0.50` and `0.0.51`, idempotent fixtures, file-backed replay test | Implemented |
| Archived/missing model, invalid/duplicate relation, actor, and stale writes | Explicit 404/403/409/422 guards with atomic parent row-version updates | Implemented |
| Live Odoo screen and paired responsive comparison | Explicit tab borrow did not receive confirmation | Blocked; no visual-parity claim |
