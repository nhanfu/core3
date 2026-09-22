# Acceptance checklist

- [x] Odoo binary `favicon` source field and image-widget contract traced.
- [x] Page/API contracts retain `page.id: website-settings` separation.
- [x] Upload/replace requires `website.manage`.
- [x] Missing Website, invalid MIME/size, and stale row-version writes are guarded.
- [x] Uploaded bytes, metadata, and row version persist in DuckDB.
- [x] Migration replay and file-backed restart preserve the favicon.
- [x] Authenticated favicon download returns the exact uploaded bytes.
- [x] Read-only Website actor receives 403 and the row remains unchanged.
- [x] Shared SettingsView renders an image preview/file control and refresh-safe status.
- [ ] Authenticated Odoo/Core3 desktop comparison at 1440x900.
- [ ] Authenticated Odoo/Core3 mobile comparison at 390x844.

The final two checks are blocked by BrowserSkill tab ownership; this feature
does not claim visual parity.
