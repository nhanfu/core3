# Source comparison

## Odoo 19 source

- `addons/stock/views/product_views.xml:522-533` adds the Product form
  `action_view_related_putaway_rules` stat button labelled `Putaway Rules`,
  visible for stock multi-location users and hidden for services.
- `addons/stock/models/product.py:620-633` scopes the Product Variant action
  to `product_id = self.id` or the variant's product category.
- `addons/stock/models/product.py:1226-1233` scopes the Product Template action
  to any variant of the template or the template's product category.
- `addons/stock/models/product.py:1031-1038` returns the existing
  `Putaway Rules` list action in list mode; this is a contextual action, not a
  second report surface.
- `addons/stock/views/product_strategy_views.xml:62-66,116-117` defines the
  underlying `action_putaway_tree` and the multi-location configuration menu.

## Core3 mapping

- `pages/product-template-detail.yaml` and
  `pages/product-variant-detail.yaml` remain presentation-only.
- Their API fragments add read-only `inventory.multi_location` navigation
  actions to `/putaway-rules`, joined through the existing `page.id` contract.
- `api/putaway-rules.yaml` accepts `product_template_id` or `product_id` and
  filters durable rules by selected variants or matching product category while
  retaining company, search, active, empty, and transport-error states.
- Migration `20260923030000-093-inventory-product-putaway-action.yaml` adds the
  stable same-company Storage Box rule used to prove the product-specific
  branch and restart persistence.
