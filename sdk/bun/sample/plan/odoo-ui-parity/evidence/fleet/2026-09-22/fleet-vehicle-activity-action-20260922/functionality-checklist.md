# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| Stable action mapping | Existing `fleet_vehicle_action` gains Activity after Kanban/List without a duplicate route | pass |
| YAML separation | `pages/vehicles.yaml` remains presentation-only and joins `api/vehicles.yaml` by `page.id` | pass |
| Durable rows | Stable activity IDs seed exactly once and replay without duplicates | pass |
| Activity projection | Vehicle rows expose activity type, summary, due date, assignee, state, count, and row version | pass |
| Schedule update | Fleet write can update a planned activity through the shared form action | pass |
| Company boundary | A vehicle activity from another company is rejected before mutation | pass |
| Validation | Invalid activity type, blank/oversize summary, and non-ISO due date are rejected | pass |
| Stale guard | Old activity row version returns `409 STALE_RECORD` | pass |
| Empty/error states | Existing Fleet datasource empty and transport contracts remain unchanged; no new visual claim was made | contract pass; browser pending |
| Desktop/mobile Odoo comparison | Capture the authenticated Odoo Activity action at 1440x900 and 390x844 | blocked: tab borrow timeout |
| Desktop/mobile Core3 comparison | Capture authenticated Core3 Activity action at both sizes | blocked: no authenticated Core3 runtime/session was available |
