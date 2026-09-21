# Source comparison

| Odoo 19 | Core3 bounded implementation | Result |
| --- | --- | --- |
| `Send PO` is visible on confirmed Purchase Order forms | `Send PO` header action is visible for `Confirmed` and `Received` detail records | Contract match |
| `action_rfq_send` with `send_rfq=False` | `send_confirmed_purchase_order_detail`, action `purchase.orders.email.send_po` | Separate, page-id-bound action |
| `mail.compose.message`, title `Compose Email` | `server_form`, `modal_style: mail_composer`, title `Compose Email` | Contract match; renderer dispatch blocked in browser |
| Purchase Order template and report attachment | `purchase_order_po_email_detail` prefill and `Purchase Order - <name>.pdf` | Implemented |
| Vendor, amount, expected date, acknowledgement link, signature | Deterministic SQL-rendered body with those fields and internal Core3 acknowledgement link | Bounded equivalent; vendor portal URL remains open |
| Send leaves confirmed order in `purchase` | Send inserts `purchase_order_emails` and leaves `Confirmed`/`Received` and row version unchanged | Implemented |
| Odoo sends through mail subsystem | Durable local history is recorded; external delivery is not claimed | Explicit integration follow-up |
