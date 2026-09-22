# Source comparison

| Odoo contract | Core3 contract | Result |
| --- | --- | --- |
| `livechat_note` HTML field on `discuss.channel` | `livechat_sessions.livechat_note` durable column | implemented |
| Internal route `/im_livechat/session/update_note` | `update_livechat_session_note` YAML action with the same route | implemented |
| Notes textarea, blur save, placeholder `Add your notes here...` | Session-detail Notes textarea and explicit save action | bounded implementation; blur wiring remains renderer work |
| Existing session access rules | `livechat.write` plus existing assigned-operator scope guard | implemented with Core3 scope boundary |
| Odoo write has no row-version parameter | Core3 increments `row_version` after each durable note write | intentional persistence metadata |
