# WEBSITE-PAGE-DETAIL-PUBLISH-001

## Scope

This bounded Website slice adds the missing publication controls to the
authenticated Page Manager detail form. It follows Odoo 19's
`website_pages_form_view` (`website.page`, including `is_published`) and reuses
the existing guarded `website_pages` workflow:

- Draft pages expose `Publish` to `website.write` actors.
- Published pages expose `Unpublish` to `website.manage` actors.
- Both actions refresh the detail record and its page assets.
- Row-version guards prevent duplicate or stale transitions.

The page contract remains in `services/website/pages/page-detail.yaml`; the
action contract remains in `services/website/api/page-detail.yaml`. No Odoo
frontend code or shared runtime files were changed.

## Verification

Focused test: `test/website_page_detail_publish.integration.test.ts`

The test traces the local Odoo form source, verifies page/API `page.id` joining,
checks visible state and permission guards, and verifies publish/unpublish
persistence and stale replay across a file-backed DuckDB restart.

BrowserSkill was not borrowed in this slice because the requested shared-tab
confirmation was interrupted before a borrow completed. No Odoo visual-parity
claim is made; no credentials, cookies, or independent browser were used.
