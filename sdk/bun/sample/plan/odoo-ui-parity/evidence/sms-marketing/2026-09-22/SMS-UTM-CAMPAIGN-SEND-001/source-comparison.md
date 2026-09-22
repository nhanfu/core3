# Source comparison

| Odoo contract | Core3 mapping | Result |
| --- | --- | --- |
| UTM campaign form has `Send SMS` | `create_sms_from_utm_campaign` header action | pass |
| Action defaults the active campaign and SMS mailing type | hidden `campaign_id` prefill and `sms_campaigns.campaign_id` insert | pass |
| New mailing form uses active mailing-list recipients | `sms_utm_campaign_sms_lists` select and active-list guard | pass |
| Campaign SMS count reflects the new mailing | atomic projection increment under campaign row-version guard | pass |
| Duplicate, invalid, and stale requests remain safe | YAML mutation guards and transaction rollback | pass |
| Authenticated Odoo desktop/mobile comparison | BrowserSkill tab borrow | blocked before capture |

No Odoo frontend code was copied.
