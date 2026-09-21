# Gap matrix

| Gap | Evidence | Change | Result |
| --- | --- | --- | --- |
| BoM form had no Operations Performance launcher | Local Odoo BoM view source; existing Core3 BoM stat buttons | Add page/API-bound stat action with durable `bom_id` | closed |
| No record-scoped completed-work-order report | Odoo `action_mrp_routing_time` source contract | Add graph/pivot/list/form/calendar report page and query | closed |
| Report rows had no durable BoM scope | `mrp_workorder_analysis` schema lacked `bom_id` | Migration `0.0.22` adds/migrates `bom_id` and indexed lookup | closed |
| Missing restart/permission/error proof | Module QA requirements | Focused test covers replay, restart, 401/403/503, empty, filters | closed at contract level |
| Live desktop/mobile Odoo comparison unavailable | Captures in this folder | Record exact redirect blocker; no visual sign-off | open blocker |
