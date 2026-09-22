# Source comparison

| Odoo source | Core3 contract | Result |
| --- | --- | --- |
| `addons/purchase/models/purchase_order.py` inherits `mail.thread` and overrides `message_post` | `api/purchase-detail.yaml` actions `send_purchase_order_message` and `log_purchase_order_note` | Implemented |
| `addons/purchase/views/purchase_views.xml` contains `<chatter/>` in `purchase_order_form` | `pages/purchase-detail.yaml` declares the chatter source, Send message, and Log note controls | Implemented |
| Odoo chatter stores messages against `purchase.order` | Migration `20260922200000-036-purchase-order-chatter.yaml` creates indexed `purchase_order_messages` rows | Implemented |
| Odoo generic mail-thread permissions and actor context | Purchase write permission, authenticated actor, parent row-version, missing-record, and content guards | Implemented |

This slice does not claim follower management, scheduled activities,
attachments, outbound mail delivery, or authenticated visual comparison.
