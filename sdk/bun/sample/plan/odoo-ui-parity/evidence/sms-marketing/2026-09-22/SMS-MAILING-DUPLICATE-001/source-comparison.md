# Source comparison

| Odoo contract | Core3 mapping | Result |
| --- | --- | --- |
| Shared mass-mailing form exposes `action_duplicate` for completed mailings | Conditional `duplicate_sms_mailing` header action on `sms-campaign-detail` | pass |
| Odoo returns a new `mailing.mailing` form | YAML `server_form` duplicate contract refreshes the current detail/list surfaces | bounded mapping; no shared next-form primitive |
| Copy keeps SMS content, sender, list, recipients, company, and campaign | Explicit durable insert copies those fields | pass |
| Copy starts Draft with reset delivery/test counters | Deterministic insert defaults state, counters, timestamps, and test status | pass |
| Active, Sent, permission, scope, stale, list, and content guards | YAML mutation guards with `sms_marketing.write` | pass |
| Authenticated Odoo desktop/mobile comparison | BrowserSkill reference access | blocked |

Odoo source files read:

- `/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py`
- `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/mailing_mailing_views.xml`

No Odoo frontend code was copied.
