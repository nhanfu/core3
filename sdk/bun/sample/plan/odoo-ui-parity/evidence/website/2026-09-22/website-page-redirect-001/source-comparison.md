# Source comparison

Odoo source:

- `addons/website/views/website_pages_views.xml` —
  `website_page_properties_view_form` exposes `redirect_old_url` and
  `redirect_type` with 301 and 302 choices when the URL changes.
- `addons/website/models/website_page_properties.py` — after writing a changed
  URL, enabled redirects create a `website.rewrite` from `old_url` to the new
  URL using the selected type and Website.

Core3 mapping:

- `services/website/pages/pages.yaml` and `pages/page-detail.yaml` expose the
  two edit controls.
- `services/website/api/pages.yaml` and `api/page-detail.yaml` capture the old
  URL, update the page, and insert `website_page_redirects` in one mutation.
- `services/website/migrations/20260923090000-020-website-page-redirects.yaml`
  provides durable storage and indexes.
- `website.write`, required row versions, invalid-type guards, and a same-URL
  no-op preserve the requested permission and data boundaries.
