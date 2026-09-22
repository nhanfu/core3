# Functionality checklist

- [x] Stable feature ID `WEBSITE-PAGE-EXPORT-001` recorded.
- [x] Presentation and API contracts remain separate and join by
  `page.id: website-pages`.
- [x] `Export` is declared as a `website.read` client action.
- [x] Export uses the existing Website Page Manager datasource, including
  search/status/tracking/SEO filters and the configured visible columns.
- [x] Existing published/draft rows, empty search results, CRUD, workflow,
  permission, stale, and restart guards remain covered by the focused suite.
- [ ] Odoo authenticated desktop export dialog capture.
- [ ] Odoo authenticated mobile export capture.
- [ ] Paired visual sign-off.

The last three checks are intentionally open because the shared signed-in Odoo
tab was already borrowed by another active BrowserSkill session.
