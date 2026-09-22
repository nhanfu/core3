# Source comparison

## Odoo 19 source

- `addons/stock/views/product_views.xml:8-14` adds the Product Category form
  `Putaway Rules` stat button, invoking `category_open_putaway` and gating it
  with `stock.group_stock_multi_locations`.
- `addons/stock/views/product_strategy_views.xml:101-107` defines the
  `stock.category_open_putaway` action for `stock.putaway.rule`, with
  `search_default_category_id: [active_id]` and `fixed_category: True`.
- The action opens the existing Putaway Rules list; it does not define a new
  report or detail screen.

## Core3 mapping

- `pages/product-category-detail.yaml` remains presentation-only and adds the
  `view_inventory_product_category_putaway_rules` stat button.
- `api/product-category-detail.yaml` keeps the matching `page.id`, exposes the
  active `putaway_rule_count`, and navigates with category ID/name and company
  context under `inventory.multi_location`.
- `api/putaway-rules.yaml` resolves `category_id` through the durable category
  table and filters the existing rule list, retaining active/search/company,
  empty, and declared 503 transport states.
- The existing foundation `putaway-office-supplies` rule provides the stable
  deterministic category fixture; no new schema or migration was necessary.
