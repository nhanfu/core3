# Functionality checklist

| Case | Class | Expected result | Result |
| --- | --- | --- | --- |
| CHATTER-CONTRACT | functional | Lead-detail page/API join exposes the timeline datasource and separate Send message/Log note actions | pass |
| CHATTER-MESSAGE | functional/data | A non-empty message stores actor, lead, action, and content in CRM-owned history and is returned by the timeline | pass |
| CHATTER-NOTE | functional/data | A non-empty internal note stores independently from a message and is returned with the Note label | pass |
| CHATTER-VALIDATION | security/data | Blank/whitespace and >4000-character content return bounded 400 responses without writes | pass |
| CHATTER-MISSING | security | Unknown lead returns 404 without creating history | pass |
| CHATTER-RESTART | regression/data | Migration replay and file-backed restart retain both entries | pass |
| CHATTER-UI-DESKTOP | visual | Authenticated Odoo form shows the composer controls at desktop | pass; Odoo capture only |
| CHATTER-UI-MOBILE | responsive | Authenticated Odoo mobile form shows the composer after scrolling; Core3 paired capture required for visual sign-off | blocked; Core3 runtime |
