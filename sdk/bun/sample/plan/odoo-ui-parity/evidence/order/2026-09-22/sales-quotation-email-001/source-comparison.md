# Source comparison

| Odoo 19 source | Core3 contract |
| --- | --- |
| `sale.order.action_quotation_send` in `addons/sale/models/sale_order.py` opens `mail.compose.message` with a modal target and marks a sent quotation when the composer sends. | `services/order/api/sale-order-detail.yaml` declares `send_sale_quotation` as a `server_form` with `modal_style: mail_composer`, a durable `sale_order_quotation_mails` insert, and the draft-to-sent workflow transition. |
| `addons/sale/views/sale_order_views.xml` exposes `Send` for quotation/sent states and binds it to `action_quotation_send`. | `services/order/pages/sale-order-detail.yaml` exposes the same `Send` action for `Quotation`/`Sent` and now declares `permission: orders.write` at the page boundary. |
| The composer carries recipient, subject, body, and the quotation report attachment. | The API pre-fills those fields from `sale_order_detail`, validates recipient/content, persists the attachment filename, and exposes `sale_order_quotation_mails` history. |
