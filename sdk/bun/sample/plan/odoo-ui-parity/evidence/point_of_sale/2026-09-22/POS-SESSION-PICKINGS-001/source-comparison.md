# Source comparison

| Concern | Odoo 19 source | Core3 before change | Core3 implementation |
| --- | --- | --- | --- |
| Session action | `action_stock_picking()` on `pos.session` | No session Pickings action | `open_session_pickings` in `api/pos-session-detail.yaml` |
| Visible control | `Pickings` stat button with `picking_count`, hidden at zero | Orders and Payments stat buttons only | `stat_buttons` entry in `pages/pos-session-detail.yaml` |
| Filter | Domain on `self.picking_ids` and ready-picking action | No session-scoped list | `pos_session_pickings` joins the POS picking projection to session orders and filters Ready/current company |
| List navigation | Odoo opens `stock.picking` list/form | Existing POS order Pickings list only | `/point-of-sale/session-pickings`; rows reuse `/inventory/transfer/detail` |
| Persistence | Odoo stock pickings relate to the session | Durable `pos_order_pickings` rows already existed | No duplicate schema; replay/restart assertions use the existing projection |
| Empty/error/access | Odoo action visibility and record rules | Not applicable to missing action | Explicit YAML empty state plus 401/403/404/503 metadata and `pos.read` enforcement |
