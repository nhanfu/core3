# Source comparison

| Odoo source | Core3 bounded implementation |
| --- | --- |
| `addons/mail/models/mail_activity.py:482-485` accepts `feedback` and passes it to `_action_done`. | `services/base/api/contact-detail.yaml` exposes a permissioned `server_form` with a required feedback textarea. |
| `addons/mail/models/mail_activity.py:514-600` posts the completion message, archives the activity, and retains feedback. | Core3 updates feedback, marks the planned activity done, timestamps it, increments its row version, and writes a contact chatter audit detail containing the feedback. |
| `addons/mail/views/mail_activity_views.xml:173-175` exposes Mark Done in the activity form and `:277-295` exposes activity list completion controls. | `services/base/pages/contact-detail.yaml` binds the feedback completion action to the API-owned activity list through `page.id: contact-detail`. |

This slice does not claim Odoo attachment transfer, standalone Activities-menu parity, activity form parity, or authenticated paired desktop/mobile visual evidence.
