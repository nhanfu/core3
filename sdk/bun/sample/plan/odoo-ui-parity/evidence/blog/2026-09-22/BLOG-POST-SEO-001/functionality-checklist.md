# Functionality checklist

- [x] Add idempotent nullable SEO metadata columns and deterministic demo data.
- [x] Keep page YAML layout-only and join API YAML by `page.id`.
- [x] Project metadata and computed optimization in private list/detail and
  published public operations.
- [x] Expose Odoo-mapped SEO group/list state and a `blog.write` edit action.
- [x] Normalize blank fields to NULL and compute optimization from the first
  three metadata fields.
- [x] Reject oversized values and unsafe `javascript:` OpenGraph URLs.
- [x] Enforce permission, company, stale-row, and atomicity boundaries.
- [x] Verify close/reopen persistence and migration replay.
- [ ] Authenticated desktop/mobile visual comparison — blocked by missing Odoo
  Blog and incomplete Core3 BrowserSkill sign-in.
