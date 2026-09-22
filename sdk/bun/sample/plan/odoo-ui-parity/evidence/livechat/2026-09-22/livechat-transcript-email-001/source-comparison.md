# Source comparison

| Odoo behavior | Current Core3 before slice | Classification | Change |
| --- | --- | --- | --- |
| Authenticated `/im_livechat/email_livechat_transcript` calls `_email_livechat_transcript` for a closed conversation. | Session detail had no transcript action or delivery projection. | missing | Add a closed-session `server_form` action with the exact route string. |
| Odoo validates the email and shows sending/sent/failed state. | No recipient form or validation existed. | missing | Add required email field and bounded 422 validation with success copy. |
| Odoo sends through its mail stack and offers the transcript from the closed chat info panel. | Core3 has no Live Chat outbound mail transport. | incompatible boundary | Persist a `Queued` local delivery request and state the transport boundary explicitly. |
| Delivery is tied to the conversation and protected by authenticated access. | Existing detail route already had operator scope and row versions. | partial | Reuse `livechat.write`, assigned-operator guard, closed-state guard, and optimistic concurrency. |
