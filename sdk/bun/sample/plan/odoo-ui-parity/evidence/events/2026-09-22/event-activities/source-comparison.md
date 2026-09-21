# Source comparison

| Odoo 19 source/live behavior | Core3 implementation | Result |
| --- | --- | --- |
| `event.event` uses `mail.activity.mixin` | `event_activities` migration plus `event_detail_activities` datasource | pass |
| Event form renders chatter | `event-detail.yaml` configures `message_source`, labels, actor/action/detail/timestamp fields | pass |
| Schedule Activity dialog | Page header `Schedule activity` action backed by API `server_form` | pass |
| Activity type choices | YAML form choices To-Do, Email, Call, Meeting, Document | pass |
| Summary, due date, assignee | Required summary, ISO date validation, current-user fallback / assignee field | pass |
| Save creates a planned activity | Durable insert with seeded/current actor and parent row-version advance | pass |
| Mark Done completes activity | Permissioned `complete_activity` mutation with activity and parent guards | pass |
| Closed records are protected | Cancelled event and non-planned activity guards | pass |
| Authenticated mobile activity sheet | Core3 390px DOM flow has no horizontal overflow | conditional; screenshot mismatch recorded |
