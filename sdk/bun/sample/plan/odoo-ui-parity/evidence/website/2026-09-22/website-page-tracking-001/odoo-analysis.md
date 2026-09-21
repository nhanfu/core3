# Odoo 19 source trace

- Menu/action: `Website > Site > Content > Pages` → `action_website_pages_list`
  in `addons/website/views/website_pages_views.xml`.
- Page list: `website_pages_tree_view` includes hidden `track` and visible
  `is_seo_optimized` fields.
- Search filters: `Tracked`, `Not tracked`, and `Not SEO optimized` are
  declared by `website_pages_view_search`.
- Persistence: `addons/website/models/ir_ui_view.py` declares
  `track = fields.Boolean`; `website.page` inherits the view model in
  `addons/website/models/website_page.py`.
- Demo evidence: `addons/website/data/website_data.xml` marks the homepage and
  contact page tracked.

The live authenticated session was inspected at `http://localhost:8069` using
database `core3_reference` on browser instance `245ea108`. The account exposed
Discuss through Expenses/Apps but no Website application; direct
`/odoo/website-pages` returned to Discuss.
