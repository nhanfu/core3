# Source comparison

Odoo source inspected:

- `website_sale/models/product_template.py` defines
  `public_categ_ids = fields.Many2many(...)` with relation
  `product_public_category_product_template_rel`.
- `website_sale/views/product_views.xml` renders `public_categ_ids` with
  `many2many_tags` in the Website Products list view.
- `website_sale/views/website_sale_menus.xml` maps the Products menu to
  `product_template_action_website`.
- `website_sale/models/product_template.py` uses the `public_categ_ids`
  descendant (`child_of`) domain in website product search.

Core3 comparison:

- Migrations `096` and `097` add the assignment table and deterministic Mug,
  Chair fixtures.
- `api/product-detail.yaml` and `pages/product-detail.yaml` remain separate;
  the API exposes assignment/options sources and permissioned actions while
  the page binds a category ListView by source ID.
- The relation stores product ownership/company and row versions so assignment
  changes are durable and stale-safe.
