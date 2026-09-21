# Odoo 19 analysis

## Source route and workflow

- `addons/im_livechat/static/src/embed/cors/livechat_routing_map.js` maps the
  normal `/mail/message/post` request to
  `/im_livechat/cors/message/post` for an embedded cross-origin widget.
- `addons/im_livechat/controllers/cors/thread.py` exposes the public CORS
  route, calls `force_guest_env(guest_token)`, and delegates to the mail
  thread message-post implementation.
- `addons/im_livechat/controllers/thread.py` preserves the selected chatbot
  answer context while delegating the message post.
- `addons/mail/controllers/thread.py` validates thread access, prepares the
  post data, calls `message_post`, and returns the persisted message id and
  store data.
- `addons/im_livechat/static/src/embed/common/composer_patch.js` labels the
  live-chat composer placeholder `Say something...`.
- `addons/im_livechat/static/src/embed/common/thread_model_patch.js` permits
  posting while the conversation is active and disables it after the
  livechat conversation has ended; the disabled copy is `This livechat
  conversation has ended.`

## Live reference

The authenticated `core3_reference` service at `http://localhost:8069` was
reachable, but `/im_livechat/support/1` returned Odoo Error 404. The backend
launcher also had no Live Chat application entry. Therefore no installed
public widget composer, guest token, or message request could be exercised in
the reference database.

## Odoo menu/action inventory impact

This is a public widget controller/UI slice, not an authenticated backend
menu action. It belongs to the existing Live Chat visitor conversation surface
and does not add an authenticated menu item.
