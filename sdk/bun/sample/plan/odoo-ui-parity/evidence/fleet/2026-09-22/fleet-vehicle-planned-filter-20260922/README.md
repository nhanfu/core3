# Fleet Planned for Change filter — FLEET-VEHICLE-PLANNED-FILTER-001

This bounded slice implements Odoo's stable `planned` search filter from
`fleet_vehicle_view_search` and its vehicle-type-specific
`plan_to_change_car` / `plan_to_change_bike` domain.

- Odoo source: `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml`
- Core3 page/API seam: `services/fleet/pages/vehicles.yaml` and
  `services/fleet/api/vehicles.yaml`, joined by `page.id: vehicles`
- Durable schema/data: migrations `20260922190000-053` and
  `20260922191000-054`
- Workflow integration: `action_accept_driver_change` clears both planned flags
  atomically with the driver promotion

The implementation is YAML-first: the page owns the filter declaration, the
API owns the SQL predicate and datasource, and the migration owns deterministic
flag state. Read permission remains `fleet.read`; the existing driver-change
mutation remains `fleet.write` with row-version guards.

Authenticated Odoo visual verification is blocked. BrowserSkill connected to
instance `245ea108`; the existing user tab borrow did not complete within the
confirmation timeout. A task-created tab at `http://localhost:8069/odoo/fleet`
was authenticated but resolved to Discuss/OdooBot with no Fleet menu at desktop
or mobile sizes. Blocker captures are recorded outside Git:

- `/tmp/core3-odoo-parity/fleet-planned-filter-20260922/odoo-discuss-desktop.png`
- `/tmp/core3-odoo-parity/fleet-planned-filter-20260922/odoo-discuss-mobile.png`

No Odoo Fleet or Core3 visual-parity claim is made.
