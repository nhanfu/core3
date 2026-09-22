# Gap matrix

| Stable ID | Gap | Implemented behavior | Verification |
| --- | --- | --- | --- |
| WEBSITE-SETTINGS-IDENTIFICATION-001 | Missing Website Settings action/menu | `/website-settings`, Configuration > Settings, Website detail Settings action | Contract test; browser blocked |
| WEBSITE-SETTINGS-IDENTIFICATION-001 | Durable name/domain editing absent | YAML server mutation updates `website_websites`, increments `row_version`, preserves site scope | Focused integration test |
| WEBSITE-SETTINGS-IDENTIFICATION-001 | Invalid/stale writes unguarded | Required name, http/https domain, missing record, stale version guards are atomic | Focused integration test |
| WEBSITE-SETTINGS-IDENTIFICATION-001 | Text setting controls rendered as checkbox | SettingsView supports styled text inputs | Frontend build and browser gate required |
| WEBSITE-SETTINGS-FAVICON-001 | Odoo Favicon upload | Not in bounded scope | Follow-up; no claim |
