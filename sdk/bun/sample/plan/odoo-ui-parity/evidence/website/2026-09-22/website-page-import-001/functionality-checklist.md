# Functionality checklist

- [x] Stable feature ID `WEBSITE-PAGE-IMPORT-001` recorded.
- [x] Presentation and API contracts remain separate and join by
  `page.id: website-pages`.
- [x] Page Manager visibly declares `Import` with `website.write`.
- [x] Import form validates empty input, row shape, Website IDs, and duplicate
  Website/URL rows before changing data.
- [x] Imported page metadata is durable and idempotent by Website/URL; updates
  advance `row_version`.
- [x] Read-only dispatcher boundary returns 403 and leaves the database
  unchanged.
- [x] Existing Page Manager CRUD, publication workflow, stale, empty/search,
  and restart tests remain separate regression coverage.
- [ ] Odoo authenticated desktop import capture.
- [ ] Odoo authenticated mobile import capture.
- [ ] Paired visual sign-off.

The last three checks are intentionally open because the shared signed-in Odoo
tab was already owned by another BrowserSkill session.
