# Source comparison

## Odoo 19

- `addons/stock/views/product_views.xml:391-398` adds the
  `product.product` form stat `action_open_product_lot`, visible for tracked
  products and stock users with production-lot access.
- `addons/stock/views/product_views.xml:514-521` adds the same stat to the
  `product.template` form.
- `addons/stock/models/product.py:647-660` scopes the variant action to one
  product, sets the product default/read-only context, and groups by location.
- `addons/stock/models/product.py:1248-1264` scopes the template action to all
  variants, sets the template context, and groups by location; the shared
  `stock.action_product_production_lot_form` is kanban/list/form with the lot
  search, At Customer, On Hand, and group-by filters from
  `addons/stock/views/stock_lot_views.xml:151-169`.

## Core3 before this slice

- Product and Product Variant detail pages had no Lot/Serial Numbers stat or
  contextual action.
- The existing `/lots` page already had the required list/kanban/form layout,
  search, availability filters, location grouping, CRUD, and safe empty/503
  states, but its datasource ignored product context.
- Product detail datasources did not expose a lot count.

## Core3 after this slice

- `pages/product-template-detail.yaml` and `pages/product-variant-detail.yaml`
  expose tracking-gated Lot/Serial Numbers actions.
- Matching API fragments navigate to `/lots` with a template or variant ID and
  the current company.
- `api/lots.yaml` filters by selected product/template, company, search, and
  availability while preserving the existing route behavior.
- Product detail queries expose `lot_count`; migration
  `20260923020000-092-inventory-product-lot-action.yaml` seeds two stable lots
  with two locations and is replay-safe.
