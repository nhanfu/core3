# Source comparison

| Odoo 19 source/live behavior | Core3 implementation | Result |
| --- | --- | --- |
| `event.event` uses `mail.thread` | `event_messages` migration and `event_detail_chatter` datasource | pass |
| Event form renders `<chatter/>` | `event-detail.yaml` configures unified chatter and composer labels | pass |
| Send message composer | `send_event_detail_message`, `order_chatter` message contract | pass |
| Log note composer | `log_event_detail_note`, `order_chatter` note contract | pass |
| Event created stream entry | Deterministic migration 037 seed | pass |
| Existing activities remain in the stream | `UNION ALL` message/activity timeline | pass |
| Actor, content, event state, and concurrency protection | Permissioned mutations with 403/409/422 guards and parent version advance | pass |
| Authenticated Odoo desktop/mobile composer | Captured reference PNGs in this folder | pass |
| Authenticated Core3 desktop/mobile composer | No capture claimed after requested session closure | open/blocker |
