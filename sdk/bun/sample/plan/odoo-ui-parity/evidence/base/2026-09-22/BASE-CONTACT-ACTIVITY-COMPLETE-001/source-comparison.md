# Source comparison

| Odoo source | Core3 bounded implementation |
| --- | --- |
| `addons/mail/views/mail_activity_views.xml:277-281` renders the Next Activities list and its Done/Cancel actions. | `services/base/pages/contact-detail.yaml` binds Mark done and Cancel actions to the `contact_activities` ListView. |
| `addons/mail/models/mail_activity.py:451-485` completes active activities through feedback/action-done logic. | `services/base/api/contact-detail.yaml` updates planned rows to `done`, stores `completed_at`, increments `row_version`, and writes a chatter audit row. |
| `addons/mail/models/mail_activity.py:647-650` cancels active activities by unlinking them. | `services/base/api/contact-detail.yaml` deletes only planned rows after actor/company/version guards and records cancellation audit. |
| Odoo requires the activity to be active/planned for these actions. | Core3 guards `state = 'planned'`, company scope, signed-in actor, and expected row version. |

The slice intentionally does not claim rescheduling, completion feedback/attachments, or standalone mail activity-menu parity.
