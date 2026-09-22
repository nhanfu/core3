# Source comparison

| Concern | Odoo 19 source | Core3 before change | Core3 implementation |
| --- | --- | --- | --- |
| Session action | `action_view_order()` on `pos.session` | No session Orders action | `open_session_orders` in `api/pos-session-detail.yaml` |
| Visible control | Orders stat button with `order_count` | Inline Orders grid only | `stat_buttons` entry in `pages/pos-session-detail.yaml` |
| Filter | Domain on selected session IDs | Detail grid scoped to parent, no list action | `pos_session_scoped_orders` query filters `o.session_id = :session_id` |
| Company boundary | Odoo record rules | Existing Core3 session scoping | Query requires both order and session company to equal `:current_company_name` |
| List/form navigation | `list,form` action | No action route | `/point-of-sale/session-orders`; rows reuse `/point-of-sale/order-detail` |
| Empty/error states | Odoo list help and access behavior | Not applicable to action | Explicit YAML datasource metadata and empty state |
