# Source comparison

| Odoo source behavior | Core3 implementation | Result |
| --- | --- | --- |
| Inventory → Configuration → Settings menu | `services/inventory/manifest.yaml` → `/inventory/settings` | Present; manager-gated |
| `stock.action_stock_config_settings` opens a settings form | `services/inventory/pages/settings.yaml` `SettingsView` | Present |
| Annual Inventory Day and Month label | `annual_inventory_day` number plus `annual_inventory_month` select | Present |
| Day default 31 | Migration `20260920180000-022-inventory-annual-inventory-settings.yaml` update | Present and deterministic |
| Month default December (`'12'`) | Same migration and API query | Present and deterministic |
| Editable related company settings | `inventory.settings.update` mutation with row-version guard | Present; durable settings row |
| Odoo setting visibility groups | Page, menu, datasource, and mutation require `inventory.manage` | Present |
| Odoo desktop/mobile form render | Core3 captures at 1440x900 and 390x844 | Core3 pass; Odoo action blocker captured |

The Core3 page and API are intentionally separate YAML files and are joined by
`page.id: inventory-settings`; no browser-only contract is used.
