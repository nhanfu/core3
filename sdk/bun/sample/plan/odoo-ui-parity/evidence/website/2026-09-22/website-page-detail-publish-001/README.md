# WEBSITE-PAGE-DETAIL-PUBLISH-001

## Source trace

Odoo 19 `addons/website/views/website_pages_views.xml` defines the
`website_pages_form_view` for `website.page` and exposes the `is_published`
field. `addons/website/models/website_page_properties.py` applies the
published/unpublished state to the underlying page view. Core3 keeps the
presentation contract in `services/website/pages/page-detail.yaml` and the
action contract in `services/website/api/page-detail.yaml`, joined by
`page.id: website-page-detail`.

## Core3 implementation

- Draft rows expose `Publish` to `website.write` users.
- Published rows expose `Unpublish` to `website.manage` users.
- Both detail actions use the shared `website_pages` workflow and refresh the
  page detail and asset datasources.
- Required row-version guards reject missing versions, duplicate transitions,
  and stale writes with HTTP 400/409 responses.
- Deterministic draft `Contact us` data is persisted by the Website migrations;
  migration replay and file-backed DuckDB restart preserve state and version.

## Verification

`test/website_page_detail_publish.integration.test.ts` traces the Odoo source,
asserts page/API joining, exercises the exact `/api/actions/website.pages.publish`
and `unpublish` endpoints, checks permission denial, and verifies restart-safe
state transitions.

Authenticated reference-browser evidence is blocked; see `browser-check.md`.
