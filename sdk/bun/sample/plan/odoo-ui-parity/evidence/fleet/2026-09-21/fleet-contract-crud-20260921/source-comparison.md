# Source comparison

| Odoo source contract | Core3 implementation | Result |
| --- | --- | --- |
| `fleet_vehicle_log_contract_action`; six view modes and open default | `pages/contracts.yaml` declares the same six modes and API query keeps Running/open default | Supported in bounded slice |
| Editable contract form and list | `pages/contract-detail.yaml` uses `OdooFormView`; `contracts.yaml` uses `ListView`; API owns mutations | Supported |
| Required `vehicle_id`, dates, state, recurring values | API create/edit fields and SQL guards validate relation, date ordering, non-negative cost, and allowed state | Supported |
| Fleet-user CRUD access | `fleet.read` datasource/page access and `fleet.write` mutation actions | Supported |
| Active/archive state and generic archive behavior | Migration adds `active`; API exposes archive/restore and list include-archived filter | Supported |
| Clickable statusbar and model state actions | API exposes New/Running/Expire/Cancel actions; detail page declares statusbar and guarded buttons | Supported in bounded slice |
| Chatter, responsible/vendor/service many2one relations, generated renewal activities | Existing Core3 contract fixture has simplified text relations and no chatter/activity persistence | Deferred shared primitives |
| Live Odoo visual comparison | No Fleet menu in requested live database/session | Blocked, not claimed |
