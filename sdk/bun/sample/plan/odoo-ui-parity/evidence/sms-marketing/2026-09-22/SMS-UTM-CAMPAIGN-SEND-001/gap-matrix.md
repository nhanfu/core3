# Gap matrix

| Gap before change | Evidence | Change | Status |
| --- | --- | --- | --- |
| Campaign form had no Odoo `Send SMS` action | `pages/utm-campaign-detail.yaml` had no header action; Odoo source defines `action_create_mass_sms` | Added permissioned Send SMS server form | closed |
| SMS mailings had no durable campaign relationship | `sms_campaigns` schema had no campaign column | Added migration 017 column/index and migration 018 fixed links | closed |
| Campaign SMS count was not updated by new mailing creation | UTM projection was independent of mailing creation | Incremented count atomically with parent row-version guard | closed |
| Unsafe stale campaign form could create an unlinked mailing | No parent version guard existed | Rejects stale/inactive campaign before insert and rolls back | closed |
| Authenticated Odoo desktop/mobile evidence | Tab `1770662590` already borrowed by BrowserSkill session `ivfy` | No takeover or alternate login; no screenshots claimed | blocked |
