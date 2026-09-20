# Source comparison

| Odoo source behavior | Core3 implementation | Result |
| --- | --- | --- |
| Reporting menu `stock_move_menu` opens `stock_move_action` | Inventory manifest adds `/moves-analysis` with `inventory.read`; page route is `/inventory/moves-analysis` | Closed; authenticated captures |
| `stock.move` report defaults to Done and supports Ready/To Do/Done | API query maps those filters to deterministic `Done`, `Assigned`, `Confirmed`, and `Waiting` rows | Closed; focused test |
| Incoming/Outgoing/Inventory filters and date/search/group states | API exposes movement type/date/search and page declares source group-by states | Closed; focused test |
| List, pivot, graph, kanban, and read-only form | ListView declares visible tabs and separate detail page/API; pivot/graph/kanban use the same source | Closed; Core3/Odoo desktop/mobile evidence |
| Odoo report is read-only (`create="0"`, `edit="0"`) | No create/update/delete actions; detail and navigation require `inventory.read` | Closed; permission test |
| Durable stock-move records | Migration `0.0.27` creates `inventory_stock_moves` with eight deterministic rows | Closed; restart test |

Residuals: full actor/company scope matrix, relocation workflow, PDF/export
report behavior, and the complete Odoo move form field surface remain outside
this bounded report slice.
