# INV-PRODUCT-REORDERING-001 source comparison

- Odoo 19 `addons/stock/models/product.py:601-615` implements
  `action_view_orderpoints`, opening `stock.action_orderpoint`, preserving the
  not-snoozed filter, and applying the selected product as the default/search
  product context. `product.template` delegates to its variants at
  `product.py:1238-1240`.
- Odoo product forms expose the action as the `Reordering Rules` stat surface
  at `addons/stock/views/product_views.xml:476-497`, with separate one-rule
  Min/Max and multi-rule count variants.
- Core3 maps both product-template and product-variant actions to the existing
  `/reordering-rules` YAML page, passes stable product context, and keeps page
  YAML presentation-only. The shared datasource filters through the durable
  `inventory_product_orderpoint_links` relation.
- Migration `0.0.95` seeds deterministic product/template/orderpoint links for
  Storage Box and Corner Desk using `2026-01-15` timestamps. The API exposes
  active `reordering_rule_count` values and preserves `inventory.read` for
  reads; no product-form mutation was added.
