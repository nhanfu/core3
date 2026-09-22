# Source comparison

| Contract | Odoo | Core3 | Classification |
| --- | --- | --- | --- |
| Action identity | `fleet_vehicle_action`, model `fleet.vehicle` | Existing `/vehicles`, `page.id: vehicles` | implemented |
| View order | `kanban,list,form,pivot,activity` | Existing Kanban/List/Form plus new Activity mode | implemented for bounded Activity gap; Pivot remains separate work |
| Activity record | Mail activity rendered in `fleet_vehicle_view_activity` | `fleet_vehicle_activities` durable table and lateral projection | implemented |
| Identity fields | License plate and model in activity template | Vehicle name and license plate in shared ActivityView | implemented with Core3 field names |
| Schedule behavior | Odoo activity scheduling from the activity surface | `schedule_fleet_vehicle_activity`, `fleet.write`, row-version/company/date/type guards | implemented |
| Visual proof | Requires authenticated Odoo action | Borrow request timed out before the user tab moved to the Agent Window | blocked; no parity claim |
