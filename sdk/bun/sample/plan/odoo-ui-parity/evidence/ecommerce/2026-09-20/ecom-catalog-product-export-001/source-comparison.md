# Source comparison

- Odoo `website_sale/views/product_views.xml` defines
  `product_template_action_website` for the Website Products
  kanban/list/form action, with website sequence ordering and published
  defaults.
- Odoo's standard list view provides the read-protected Export affordance for
  visible product rows; this is a list action rather than a new product model.
- Core3 `pages/products.yaml` owns the rendered Products list and
  `api/products.yaml` owns the matching `page.id` export action.
- The Core3 export uses the authenticated `ecommerce_products` datasource,
  current company filter, stable CSV columns, and JSON escaping.

The supplied Odoo references returned exact HTTP 404 for `/shop` on ports 8069
and 8073, so no paired Website/eCommerce screenshot comparison is claimed.
