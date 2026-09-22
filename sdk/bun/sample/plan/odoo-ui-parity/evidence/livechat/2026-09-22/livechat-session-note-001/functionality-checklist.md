# Functionality checklist

- [x] Stable page/API id remains `livechat-session-detail`.
- [x] Detail datasource returns `livechat_note`.
- [x] Internal note action retains `/im_livechat/session/update_note`.
- [x] Markup-compatible note content persists and can be cleared.
- [x] Missing sessions return 404 without a write.
- [x] Assigned-scope denial returns 403 without changing note/version.
- [x] Migration replay is idempotent and demo seed is deterministic.
- [ ] Authenticated Odoo/Core3 desktop comparison at 1440x900.
- [ ] Authenticated Odoo/Core3 mobile comparison at 390x844.
- [ ] Renderer-level blur-save behavior matching the Odoo side panel.
