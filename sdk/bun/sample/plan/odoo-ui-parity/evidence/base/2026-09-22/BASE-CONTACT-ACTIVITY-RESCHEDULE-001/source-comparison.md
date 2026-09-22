# Source comparison

| Odoo source | Core3 bounded implementation |
| --- | --- |
| `addons/mail/views/mail_activity_views.xml:277-284` renders Next Activities with Today, Tomorrow, and Next Week list actions. | `services/base/pages/contact-detail.yaml` makes the activity list selectable, adds three bulk actions, and adds the same three row actions. |
| `addons/mail/views/mail_activity_views.xml:293-295` exposes per-activity reschedule controls alongside Done/Cancel. | The activity list action column exposes row-level reschedule controls and keeps them visible only for planned rows. |
| `addons/mail/models/mail_activity.py:638-645` sets active deadlines to today, tomorrow, or the Monday of next week. | `services/base/api/contact-detail.yaml` uses `CURRENT_DATE`, `CURRENT_DATE + INTERVAL '1 day'`, and the next Monday from `DATE_TRUNC('week', CURRENT_DATE)`. |
| Odoo mutates only active activities. | Core3 guards planned state, current-company scope, authenticated actor, and row version for row actions; bulk actions reject selections containing non-planned or out-of-scope records. |

The slice does not claim standalone Activities-menu parity, feedback/attachments,
or authenticated paired desktop/mobile visual evidence.
