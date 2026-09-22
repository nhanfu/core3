# Functionality checklist

- [x] Odoo action/menu/source labels recorded.
- [x] Page/API YAML are separate and join by `page.id`.
- [x] Website Name and Domain fields read from durable Website rows.
- [x] Valid update persists and increments the row version.
- [x] Empty/overlong name and invalid domain return 422 without mutation.
- [x] Missing Website returns 404; stale row version returns 409.
- [x] File-backed restart and idempotent migration replay preserve values.
- [x] `website.manage` is required on datasource and mutation action.
- [ ] Favicon binary upload.
- [ ] Authenticated Odoo/Core3 desktop/mobile visual comparison.
