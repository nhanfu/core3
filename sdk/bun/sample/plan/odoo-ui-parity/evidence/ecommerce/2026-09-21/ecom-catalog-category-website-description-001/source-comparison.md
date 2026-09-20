# Source comparison

## Odoo

- `addons/website_sale/models/product_public_category.py` defines
  `website_description = fields.Html` on `product.public.category`.
- `addons/website_sale/views/website_sale_menus.xml` maps the Catalog
  Categories menu to `product_public_category_action`.
- `addons/website_sale/views/product_public_category_views.xml` exposes the
  field in the category form.
- `addons/website_sale/views/templates.xml` renders
  `category.website_description` in the category header.

## Core3 mapping

- Migrations `092/093` add durable category HTML content and a deterministic
  Accessories description fixture.
- Category Detail remains a paired `page.id: ecommerce-category-detail`
  contract. Its API exposes the description and its page binds a rich-text
  field to a write-protected update/clear action.
- The mutation enforces active category ownership, current-company scope,
  10,000-character safe-HTML validation, optimistic row versions, and
  restart persistence.

The bounded implementation does not claim Odoo website-editor block parity,
translations, category footer, display-toggle configuration, or paired Odoo
screen sign-off.
