# Gap matrix

| Odoo action | Core3 before | Required change | Result |
| --- | --- | --- | --- |
| `action_view_stock_move_lines` on Product form | No Product-detail entry; global Moves History had no template scope. | Add a stable read action, deterministic template-to-move relation, and query filter on the existing report. | Implemented; focused integration tests pass. |
| Product-template variant domain | Product detail had variants but no move aggregation. | Expose `move_count` from the service-owned detail datasource and scope all linked moves. | Implemented for the bounded fixture. |
| Authenticated Odoo/Core3 visual comparison | No current borrowed signed-in tab. | Borrow shared tab and capture desktop/mobile. | Blocked by extension confirmation timeout; no claim made. |
