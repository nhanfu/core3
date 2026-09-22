# Source comparison

| Odoo behavior | Core3 implementation | Result |
| --- | --- | --- |
| `maintenance.request` mail.thread chatter | `pages/request-detail.yaml` binds `maintenance_request_activity` through the existing `OdooFormView` chatter primitive | implemented |
| `Log note` action | `api/request-detail.yaml` action `log_maintenance_request_note`, `maintenance.write`, `order_chatter`, `operation: note` | implemented |
| Internal-note persistence | `maintenance_request_messages` table and migration `20260922230000-010-maintenance-request-chatter-note.yaml` | implemented |
| Chatter timeline | Activity datasource unions durable messages and request activities by `request_id` | implemented |
| Actor/content/stale guards | 403 actor, 404 missing request, 409 archived/row-version conflict, 422 blank/overlong content | implemented |
| Odoo Send message | Not part of this bounded feature | deferred |
| Odoo followers/attachments | Not part of this bounded feature | deferred |

The page remains presentation-only; the API fragment owns the datasource and
mutation and is joined through `page.id: maintenance-request-detail`.
