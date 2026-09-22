# Source comparison

| Contract | Odoo | Core3 |
| --- | --- | --- |
| Form | `<chatter/>` on `fleet_vehicle_view_form` | `message_source` on `vehicle-detail` |
| Message/note | mail.thread composer and internal note | `order_chatter` message/note actions |
| Timeline | mail messages plus activities | durable messages unioned with `fleet_vehicle_activities` |
| Persistence | Odoo mail records | migrations `048`/`049`, stable IDs, restart proof |
| Scope | Fleet vehicle record/company access | `fleet.read`/`fleet.write`, company and row-version guards |
| Visual proof | authenticated desktop/mobile required | blocked by tab-borrow timeout; no parity claim |
