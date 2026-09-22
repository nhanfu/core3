# Odoo analysis

- Controller: `/home/nhanjs/projects/odoo/addons/im_livechat/controllers/channel.py`
  defines authenticated `POST` JSON-RPC `/im_livechat/session/update_note`.
- Permission behavior: shared/public users receive `NotFound`; an internal
  user searches `discuss.channel` by id and writes `livechat_note` with
  `Markup(note)`.
- Model: `addons/im_livechat/models/discuss_channel.py` defines `livechat_note`
  as an HTML field, visible to internal users with access to the session.
- Frontend: `static/src/core/web/livechat_channel_info_list.xml` renders the
  `Notes` textarea with placeholder `Add your notes here...`; the component
  saves on blur through the same route.
- Reference probe: BrowserSkill reached `http://localhost:8069` using the
  requested environment, but `/im_livechat/support/1` returned Odoo Error 404.
