# Gap matrix

| Gap | Odoo contract | Core3 implementation | Evidence |
| --- | --- | --- | --- |
| Public send action | `/im_livechat/cors/message/post`, public auth, guest/thread ownership | `send_livechat_visitor_message`, `livechat.public`, `id` + `visitor_token` from the token-scoped page route | PM-001, PM-003 |
| Composer UI | Embedded Live Chat composer, `Say something...`, active-only workflow | Existing `OdooChatter` on `livechat-visitor-session` with `Send message`; shared renderer retains its generic cancel/send controls | PM-002, PM-009 |
| Message validation | Mail thread post rejects invalid/unauthorized/ended thread | 1–4000 trimmed content, token ownership, non-Closed state guards | PM-003–PM-005 |
| Persistence | `mail.message` thread record and updated conversation state | Existing `livechat_session_messages` row plus atomic `message_count`/`row_version` update | PM-006, PM-007 |
| Public reference | Installed addon widget route | Reference addon unavailable and route is 404 | PM-009 |
