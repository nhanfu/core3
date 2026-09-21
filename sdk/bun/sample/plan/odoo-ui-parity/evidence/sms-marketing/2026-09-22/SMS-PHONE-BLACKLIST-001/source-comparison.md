# Source comparison

| Contract | Odoo 19 source | Core3 mapping | Result |
| --- | --- | --- | --- |
| Menu/action | `mass_mailing_sms/views/mailing_sms_menus.xml`: Configuration → Blacklisted Phone Numbers, action `phone_validation.phone_blacklist_action` | `manifest.yaml` configuration group → `/sms-phone-blacklist` | implemented |
| List | `phone_validation/views/phone_blacklist_views.xml`: `Blacklist Date`, `number`, Archived search filter | `pages/phone-blacklist.yaml` + `api/phone-blacklist.yaml` | implemented |
| Form | `phone_blacklist_view_form`: number field, Blacklist/Unblacklist buttons, archived badge | `pages/phone-blacklist-detail.yaml` + `api/phone-blacklist-detail.yaml` | implemented |
| Validation | `phone.blacklist.create/write` sanitizes phone number and enforces uniqueness | SQL normalization and E.164-style validation guards | implemented for bounded contract |
| Unblacklist | Odoo opens a reason wizard and archives the record | Core3 archives the record and persists `last_action_reason` | implemented with durable audit field |
| Chatter | Odoo phone blacklist inherits `mail.thread` | Not exposed in this bounded Core3 slice | partial, explicitly deferred |
| Live UI | SMS addon is not installed in authenticated `core3_reference` | Apps-only diagnostic; no paired screen available | blocked |
