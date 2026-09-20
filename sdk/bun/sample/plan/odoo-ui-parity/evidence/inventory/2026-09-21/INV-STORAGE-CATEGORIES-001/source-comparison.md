# INV-STORAGE-CATEGORIES-001 source comparison

Odoo source:

- `addons/stock/views/stock_storage_category_views.xml:3-76` defines the
  `stock.storage.category` form/list and `action_storage_category`.
- `addons/stock/views/stock_storage_category_views.xml:78-100` defines the
  capacity list/action and `menu_storage_categoty_config` under Warehouse
  Management with `stock.group_stock_multi_locations`.
- `addons/stock/views/stock_location_views.xml:129-134` defines the Locations
  stat action filtered by `storage_category_id`.
- `addons/stock/models/stock_storage_category.py:7-74` defines category and
  capacity fields plus non-negative weight, positive quantity, and unique
  product/package-per-category constraints.

Core3 mapping:

- `pages/storage-categories.yaml` + `api/storage-categories.yaml`, joined by
  `page.id: storage-categories`, provide the source list and New action.
- `pages/storage-category-detail.yaml` +
  `api/storage-category-detail.yaml`, joined by `page.id:
  storage-category-detail`, provide category fields, product/package capacity
  line CRUD, and assigned-location drilldown.
- Migration `20260921180000-044-inventory-storage-categories.yaml` persists
  deterministic category, capacity, and location relation data. Company scope,
  permissions, and parent/line row versions are enforced in API guards.

The Core3 contract covers the source-backed category and capacity lifecycle.
Live Odoo visual comparison is not claimed because the supplied login probe
failed before the authenticated menu could be inspected.
