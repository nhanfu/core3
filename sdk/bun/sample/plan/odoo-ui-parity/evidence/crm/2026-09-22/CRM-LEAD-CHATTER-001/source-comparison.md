# Source comparison

| Odoo behavior | Core3 source | Disposition |
| --- | --- | --- |
| CRM lead form inherits generic mail.thread chatter | `services/crm/pages/lead-detail.yaml` `OdooFormView` | implemented declaratively |
| Send message composer | `services/crm/api/lead-detail.yaml`, action `send_lead_message`, `crm.chatter.send` | implemented; CRM-owned activity log persistence |
| Log note composer | `services/crm/api/lead-detail.yaml`, action `log_lead_note`, `crm.chatter.note` | implemented; distinct action label and durable history |
| Chatter timeline reload after post | `refresh: [crm_lead_timeline]` on both actions | implemented |
| Write permission on posting | `permission: crm.write`; catalog includes `crm.chatter` | implemented at contract boundary |
| Missing/invalid content guards | action mutation guards in `api/lead-detail.yaml` | implemented |
| Odoo mail.message / mail.thread storage | `migrations/20260903000000-016-chatter-attachments.yaml` table `crm_activity_log` | deliberate CRM-local projection; no cross-module SQL |
