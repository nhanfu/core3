# Source comparison

| Odoo behavior | Core3 contract | Result |
| --- | --- | --- |
| `mail.thread` follower subscription on `event.event` | `event_followers` and `event_follower_catalog` datasources joined to `event-detail` | Implemented |
| Follower menu and visible follower list | Existing shared `OdooFormView` follower fields on `pages/event-detail.yaml` | Implemented |
| Add follower | `add_event_follower`, `events.records.followers.add`, `events.write` | Implemented |
| Remove follower | `remove_event_follower`, `events.records.followers.remove`, `events.write` | Implemented |
| Follower audit in chatter | Durable `event_messages` rows with add/remove actions | Implemented |
| Parent state/concurrency | Event `row_version`, cancelled/missing/duplicate/stale guards | Implemented |
| Odoo desktop/mobile visual parity | Odoo captures only in this checkpoint | Open: paired Core3 capture |
