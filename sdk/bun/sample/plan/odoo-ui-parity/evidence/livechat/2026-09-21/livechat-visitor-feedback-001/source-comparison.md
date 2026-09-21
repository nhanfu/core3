# Live Chat visitor feedback and leave session — source comparison

## Odoo 19 source

- `addons/im_livechat/controllers/main.py` declares public JSON-RPC routes
  `/im_livechat/feedback` and `/im_livechat/visitor_leave_session`.
- Feedback permits one rating row per `discuss.channel`, then updates that row
  on later feedback and posts the rating/reason into the conversation.
- Leaving calls `_close_livechat_session()` on the visitor-owned conversation.

## Core3 bounded contract

- `services/livechat/api/visitor-session.yaml` keeps the exact route strings on
  `submit_livechat_feedback` and `leave_livechat_session`.
- `services/livechat/pages/visitor-session.yaml` is presentation-only and
  binds to the API fragment through `page.id`.
- `20260921120000-051-livechat-visitor-feedback.yaml` durably stores visitor
  ownership, feedback, and the leave timeline event.

The intentional bounded difference is that Core3 uses a visitor token and
explicit `livechat.public` permission contract in place of Odoo's guest cookie
and `mail.guest` context. The token is not rendered as a visible field.
