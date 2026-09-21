# Source comparison

| Odoo source contract | Core3 YAML-first contract | Result |
| --- | --- | --- |
| `stock.action_picking_form` form-only `stock.picking` action | `api/transfer-new.yaml` action `create_inventory_transfer`, `action: stock.action_picking_form` | mapped |
| `default_picking_type_id: active_id` | Overview New action passes `operation_type_id`; form datasource defaults `operation-receipts` when absent | mapped with deterministic fallback |
| Draft header/state/statusbar | `pages/transfer-new.yaml` `OdooFormView`, Draft/Waiting/Ready statusbar, Save action | bounded |
| Contact, locations, scheduled date, origin | page fields plus operation/location option datasources | mapped |
| Operations / Add a Product | source-shaped Additional Info and Note are present; product-line editing is outside this bounded create slice | residual |
| Durable `stock.picking` create | YAML mutation inserts `inventory_pickings` and `inventory_transfer_create_runs`, then transfer message | implemented |
| Odoo live form and mutation | New action and direct routes show generic Odoo error modal | blocked |

The implementation does not claim line-level product creation, stock
reservation, validation, chatter, or note persistence. Those are separate
follow-up slices and are not silently represented as complete here.
