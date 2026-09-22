# Odoo analysis

Source: `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml`.

- `fleet_vehicle_action` is the Vehicles action for `fleet.vehicle` and
  declares `kanban,list,form,pivot,activity` (source lines 370-374).
- `fleet_vehicle_view_activity` is the source activity view (lines 338-356).
  It presents vehicle identity through license plate/model activity cards.
- The activity mode belongs to the existing Vehicles action; it is not a new
  Fleet menu or a second route.

Core3 uses the existing shared `ActivityView` primitive. The bounded contract
adds four standard activity types (`To-Do`, `Email`, `Call`, `Meeting`), a
vehicle/license-plate identity, due-date projection, and a schedule form.
The reference date for deterministic overdue/today labels is `2026-09-22`.
