# Fleet model vendors — `FLEET-MODEL-VENDORS-001`

This bounded slice implements the Odoo `fleet.vehicle.model.vendors` many-to-many
surface from the Model form's Vendors notebook page. It adds a durable
Fleet-owned vendor projection/catalog, model-scoped assignments, Add/Remove
actions, optimistic concurrency, and a YAML `page.id`-joined API/page contract.

The source contract was inspected at revision `659759969d535d286b656c96b675e4612b925ddd`:

- `/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model.py`
- `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml`

The shared authenticated Odoo tab at `http://localhost:8069` was listed as tab
`1770662590`, but the required explicit borrow confirmation did not resolve.
No tab was borrowed or touched, the BrowserSkill session was stopped, and no
Odoo or paired desktop/mobile visual-parity claim is made.

See [`source-comparison.md`](source-comparison.md), [`verification.md`](verification.md),
and [`gap-matrix.md`](gap-matrix.md) for the bounded evidence and remaining gaps.
