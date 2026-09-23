# Odoo/Core3 source comparison

| Contract | Odoo | Core3 | Result |
| --- | --- | --- | --- |
| Statusbar field | `fleet.vehicle.log.contract.state`, clickable | `pages/contract-detail.yaml` `statusbar` plus `statusbar_actions` | Supported |
| New transition | `action_draft` → `futur` | `set_fleet_contract_new` → `status: New` | Supported |
| Running transition | `action_open` → `open` | `set_fleet_contract_running` → `status: Running` | Supported |
| Expired transition | `action_expire` → `expired` | `expire_fleet_contract` → `status: Expired` | Supported |
| Cancelled transition | `action_close` → `closed` | `close_fleet_contract` → `status: Closed` | Supported |
| Core3 `To Renew` display value | Not an Odoo contract state | Rendered but intentionally has no statusbar action | Explicitly bounded |
| Persistence/security | Odoo Fleet users write contracts | YAML mutations require `fleet.write`, row version, and refresh detail/list | Supported |
