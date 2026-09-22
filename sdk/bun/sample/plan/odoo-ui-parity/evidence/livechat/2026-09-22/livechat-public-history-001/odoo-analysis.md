# Odoo source analysis

- `addons/im_livechat/controllers/main.py:238-243` declares public JSON-RPC
  `/im_livechat/history`, checks that the channel exists, checks that `pid` is
  a channel member, and calls `_bus_send_history_message(channel, page_history)`.
- `addons/im_livechat/controllers/cors/main.py:19-22` declares
  `/im_livechat/cors/history`, forces the guest context, and delegates to the
  same controller method.
- `addons/im_livechat/models/res_partner.py:81-91` creates the transient body:
  `No history found` for an empty list, otherwise an HTML list of target-blank
  page links, then sends it through the channel bus.
- `addons/im_livechat/static/src/embed/common/history_service.js:19-33`
  receives `im_livechat.history_command`, reads the visitor's expiring
  page-history list, and posts `pid`, `channel_id`, and `page_history`.
- `addons/im_livechat/static/tests/embed/history_command.test.js:20-40`
  verifies the history command invokes `/im_livechat/history` after the
  operator-side bus event.
