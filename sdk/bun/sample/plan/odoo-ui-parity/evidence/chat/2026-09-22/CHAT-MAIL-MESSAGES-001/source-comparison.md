# Source comparison

| Odoo source | Observed behavior | Core3 mapping |
| --- | --- | --- |
| `addons/mail/views/mail_message_views.xml:4-19` | `view_message_tree` lists date, subject, author, model, and record ID | `pages/messages.yaml` list columns and `api/messages.yaml` query |
| `addons/mail/views/mail_message_views.xml:22-103` | `mail_message_view_form` exposes message metadata, related record, body, gateway, recipients, and tracking tabs | `pages/message-detail.yaml` read-only technical form over the available durable Chat fields |
| `addons/mail/views/mail_message_views.xml:106-127` | Search covers body/content, subject, type, author, recipients, model, record, parent, mentions, and unread need-action | `api/messages.yaml` deterministic body/subject/author/thread search; unsupported recipient/notification fields remain explicit gaps |
| `addons/mail/views/mail_message_views.xml:129-134` | `action_view_mail_message` targets `mail.message` with `list,form` | `/chat/messages` and `/chat/messages/detail` |
| `addons/mail/views/mail_menus.xml:89-99` | Technical → Discuss → Messages is sequence 1, before Scheduled Messages | Chat manifest Technical group ordering |
| `addons/mail/security/ir.model.access.csv:3-5` | Internal users can read/write/create/delete `mail.message`; public access is read-only | Technical Core3 slice uses `chat.technical` and exposes a read-only inspector; mutation parity is deferred |

Core3 intentionally maps the existing persisted Chat message rows rather than copying Odoo frontend code. The technical inspector does not claim Odoo gateway, recipients, notification, tracking, or message mutation parity where the Chat-owned schema has no equivalent durable data.
