# Source comparison

| Odoo behavior | Current Core3 before slice | Classification | Change |
| --- | --- | --- | --- |
| Public CORS message post at `/im_livechat/cors/message/post` delegates through a guest token to `mail.thread.message_post`. | Visitor transcript was readable, but no visitor message action existed on the page. | missing | Add a public YAML mutation retaining the Odoo route string. |
| Composer placeholder is `Say something...`. | Visitor page had timeline, feedback, and leave actions only. | missing | Bind `message_action` and `message_placeholder` on the existing OdooFormView chatter. |
| Guest may post only to the active conversation; ended live chats disable the composer. | Feedback/leave already guarded token ownership and closed state; messages had no public mutation. | partial | Add visitor-token ownership and active-state guards; close is rejected server-side. |
| Message is persisted in the discussion thread and returned to the live transcript. | `livechat_session_messages` already exists and is used by operator/widget projections. | partial | Reuse the durable table, add visitor insert and session counters/version update. |
| Reference widget UI is available for live comparison. | `core3_reference` returns 404 for `/im_livechat/support/1`; no Live Chat launcher entry. | blocked | Preserve exact blocker evidence and avoid a visual-parity claim. |
