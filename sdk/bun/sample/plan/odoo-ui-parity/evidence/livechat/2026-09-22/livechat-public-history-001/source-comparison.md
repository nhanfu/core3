# Source comparison

| Odoo contract | Core3 implementation | Result |
| --- | --- | --- |
| `/im_livechat/history` public JSON-RPC action | `send_livechat_session_history` on the `livechat-session-detail` API fragment with `action: /im_livechat/history` | implemented |
| `/im_livechat/cors/history` guest/CORS alias | Action description retains the CORS route; source test verifies the local CORS controller delegates to the same operation | implemented at contract boundary |
| Channel member guard for `pid` | `livechat_sessions.visitor_id = partner_id` guard, plus assigned-operator scope | implemented with deterministic Core3 visitor identity |
| Empty page history | System timeline notification body is exactly `No history found` | implemented |
| Non-empty page history links | Safe system timeline notification retains the submitted page list as text | bounded equivalent; HTML link rendering is follow-up |
| Odoo transient bus delivery | Durable `livechat_session_messages` system event refreshed in the session chatter | bounded transport substitute; transient delivery is not claimed |
| Public route auth | Authenticated Core3 session-detail action requires `livechat.write` | intentional shell boundary; public visitor endpoint remains a gap |
