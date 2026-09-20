# INV-STORAGE-CATEGORIES-001 blockers

The bounded Odoo browser probe used `codex@core3.local` and recorded a failed
`POST http://127.0.0.1:8069/web/login`. The resulting screenshots are login
boundary captures only; they are not authenticated Odoo evidence. Since the
probe did not reach Inventory Configuration, no live Odoo menu, Storage
Categories record, responsive state, or mutation is claimed.

The source comparison remains exact: `menu_storage_categoty_config` requires
`stock.group_stock_multi_locations`, and the list/form/capacity/location
contracts are documented in `source-comparison.md`. No Odoo data was changed.
