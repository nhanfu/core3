# INV-PUTAWAY-RULES-001 source comparison

Odoo source:

- `addons/stock/views/product_strategy_views.xml:3-58` defines the editable
  Putaway Rules list with product/category target, arrival/store locations,
  package type, storage category, priority, company, and sublocation fields.
- `addons/stock/views/product_strategy_views.xml:60-107` defines
  `action_putaway_tree`, search filters/groupings, and `menu_putaway` under
  Warehouse Management with `stock.group_stock_multi_locations`.
- `addons/stock/models/product_strategy.py:17-95` defines the model fields,
  company requirement, strategy values, and closest-location storage-category
  relationship.

Core3 mapping:

- `pages/putaway-rules.yaml` + `api/putaway-rules.yaml`, joined by
  `page.id: putaway-rules`, provide the list, search/status filters, option
  catalogs, and manager-gated New action.
- `pages/putaway-rule-detail.yaml` + `api/putaway-rule-detail.yaml`, joined by
  `page.id: putaway-rule-detail`, provide source fields plus edit,
  archive/restore, and delete actions.
- Migration `20260921190000-045-inventory-putaway-rules.yaml` persists
  deterministic product/category rules. Guards enforce distinct active
  locations, target exclusivity, closest-location category context, company,
  duplicate, and row-version semantics.

The Core3 contract is source-backed for the reachable rule lifecycle. Live Odoo
visual comparison is blocked at the supplied login boundary and is not claimed.
