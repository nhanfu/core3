# Source comparison

| Odoo source | Observed behavior | Core3 mapping |
| --- | --- | --- |
| `addons/mail/views/mail_message_schedule_views.xml:3-22` | Form for `mail.message.schedule` exposes `mail_message_id`, `scheduled_datetime`, `notification_parameters`, and `Force Send` | `pages/scheduled-message-detail.yaml` and `api/scheduled-message-detail.yaml` |
| `addons/mail/views/mail_message_schedule_views.xml:24-43` | List/search uses Message and Scheduled Send Date | `pages/scheduled-messages.yaml` list/search and `chat_scheduled_messages` query |
| `addons/mail/views/mail_message_schedule_views.xml:45-50` | `mail_message_schedule_action`, `list,form` | `/chat/scheduled-messages`, visible List/Form tabs |
| `addons/mail/views/mail_menus.xml:104-119` | Technical → Discuss → Scheduled Messages, sequence 2 | Chat manifest `technical` group and `/chat/scheduled-messages` menu |
| `addons/mail/models/mail_message_schedule.py:31-55` | Scheduled datetime and `force_send()` notification action | Future-date edit guard and Force Send queue-removal mutation |
| `addons/mail/security/ir.model.access.csv:6` | Model access is system-group only | `chat.technical`, admin-only in the Core3 permission model |

Core3 uses existing Chat message rows as the durable related-message target.
The Force Send action records a `system_activity` dispatch audit and removes
the schedule row; external mail/bus delivery is explicitly outside this
bounded slice.
