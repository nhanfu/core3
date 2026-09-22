# Source comparison

Odoo 19 source:

- `addons/stock/models/product.py:635-645` loads
  `stock.action_storage_category_capacity`, hides package type for the
  product-form action, defaults the selected product for a single variant,
  and filters `stock.storage.category.capacity` by product IDs.
- `addons/stock/models/product.py:1235-1237` delegates the template form to
  its variants.
- `addons/stock/views/product_views.xml:411-416` and `:534-543` expose the
  Storage Capacities stat action on product and product-template forms.
- `addons/stock/views/stock_storage_category_views.xml:78-98` defines the
  list action and editable capacity fields.

Core3 mapping:

- `pages/storage-category-capacity.yaml` is layout-only and binds by
  `page.id: storage-category-capacity` to `api/storage-category-capacity.yaml`.
- The datasource filters by variant or template context, company scope, and
  deterministic search/empty/transport states.
- Create/update/delete use YAML mutation contracts with positive-quantity,
  active-product, category/company, duplicate, and optimistic row-version
  guards. The required `kind` is explicitly persisted as `product`.
- Product detail stat/header actions bind to `capacity_count` and navigate to
  the contextual list without creating a duplicate renderer.
