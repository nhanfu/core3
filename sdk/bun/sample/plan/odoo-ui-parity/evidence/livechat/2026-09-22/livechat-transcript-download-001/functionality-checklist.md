# Functionality checklist

- [x] Stable page/API join remains `livechat-visitor-session`.
- [x] Odoo HTTP and CORS route strings are source-traced.
- [x] Closed token-owned fixture returns `application/pdf` bytes.
- [x] Migration replay creates exactly two stable artifacts.
- [x] Wrong visitor token returns no transcript data.
- [x] Open session returns no transcript data.
- [x] File-backed restart preserves filename, MIME, and PDF bytes.
- [x] UI action is hidden unless the closed record has an artifact.
- [ ] Authenticated desktop/mobile Odoo/Core3 screenshots — blocked by
  BrowserSkill tab-borrow confirmation timeout.
