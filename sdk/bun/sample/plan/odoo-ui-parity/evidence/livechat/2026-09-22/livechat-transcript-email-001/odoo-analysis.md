# Odoo 19 analysis

## Source route and workflow

- `addons/im_livechat/controllers/main.py` exposes
  `/im_livechat/email_livechat_transcript` as an authenticated JSON-RPC route,
  rejects non-internal users, and calls `channel._email_livechat_transcript`.
- `addons/im_livechat/models/discuss_channel.py` implements
  `_email_livechat_transcript`, which renders the conversation email and sends
  it through Odoo's mail stack.
- `addons/im_livechat/static/src/core/common/transcript_sender.js` validates
  the email, calls the exact route with `channel_id`, and reports idle,
  sending, sent, and failed states.
- `addons/im_livechat/static/src/core/web/livechat_channel_info_list.xml`
  renders `Send conversation`, the email input, and a Download link for a
  closed live chat.

## Bounded Core3 mapping

Core3 binds the action to the existing authenticated session detail page. It
stores a `Queued` request in `livechat_transcript_deliveries`, refreshes the
session detail projection, and exposes the last recipient/time/count. This is
the durable local contract; an external mail sender is intentionally outside
this module slice.
