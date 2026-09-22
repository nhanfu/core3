# Source comparison

| Odoo 19 | Core3 YAML-first contract |
| --- | --- |
| Lead-form `action_lead_mail_compose` | `send_lead_email_detail` on `lead-detail` |
| List/kanban `action_lead_mass_mail` | `send_leads_email` on `leads` |
| `comment` composer mode | Detail `server_form` action with recipient, subject, body, template, attachment metadata |
| `mass_mail` composer mode | Bulk `server_form` action over selected lead IDs |
| Mail composer history/activity | `crm_lead_mail_messages` plus `crm.email` activity timeline entries |
| CRM/mail permissions | `crm.write` mutation and `crm.read` template/history datasources |

The API and pages remain separate and join through the existing `lead-detail`
and `leads` page IDs. The migration supplies deterministic template/history
fixtures and is replay-safe.
