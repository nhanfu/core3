# Source comparison

| Odoo contract | Core3 result | Decision |
| --- | --- | --- |
| Vehicle `tag_ids` many-to-many field | `fleet_vehicle_tag_rel` plus `tag_ids`/`tag_names` detail projection | Implemented |
| Colored many-to-many vehicle tags | `LineItemGrid` renders tag name and Odoo palette color | Implemented with shared grid |
| Add/remove assignment from vehicle workflow | `add_fleet_vehicle_tag` and `remove_fleet_vehicle_tag` YAML actions | Implemented |
| Vehicle/company/archive/actor/duplicate/stale guards | Explicit 403/404/409/422 mutation guards | Implemented |
| Odoo native inline title picker and list/kanban tag rendering | Existing Core3 vehicle list/kanban primitives are unchanged | Deferred outside this bounded detail workflow |
| Live Odoo visual comparison | Fleet is absent from the authenticated requested database | Blocked; no parity claim |
