# Source comparison

| Odoo behavior | Core3 contract | Status |
| --- | --- | --- |
| Operation card `All` invokes `get_stock_picking_action_picking_type` | `open_inventory_all_transfers` navigates from each overview card with operation/company context | implemented |
| `All Transfers` names the `stock.picking` action | API refresh action declares `stock.stock_picking_action_picking_type` | implemented |
| Selected card limits transfers to its `picking_type_id` | `operation_type_id` query parameter filters real `inventory_pickings` | implemented |
| Company context is preserved | Context, rows, refresh history, and guards are company-scoped | implemented |
| Transfer list supports search and state/action navigation | YAML ListView, filters, groups, and existing transfer-detail route | implemented |
| Odoo responsive/list view rendering | Core3 list/mobile-card declarations | partial; authenticated visual capture blocked |

This slice does not duplicate Receipts, Deliveries, Internal, Ready, Waiting,
Late, Backorders, or New Transfer. It does not add transfer mutations; those
remain owned by the shared transfer-detail workflow.
