# Source comparison

| Odoo source behavior | Core3 implementation | Result |
| --- | --- | --- |
| `receipt_reminder_email` and `reminder_date_before_receipt` on the order form | `purchase_order_detail` fields in `pages/purchase-detail.yaml`, backed by migration `20260922130000-031` | Implemented as read-only bounded display fields |
| Form `Send Reminder` action, gated by `group_send_reminder` | `preview_purchase_reminder_detail`, `purchase.write`, source action `purchase.orders.send_reminder_preview` | Implemented as a durable sample-preview action |
| Reminder mail template contains vendor, order, expected date, and Acknowledge link | Deterministic HTML body and `Purchase: Vendor Reminder` template label | Implemented |
| Odoo sends a sample to the signed-in user without changing order state | `purchase_order_reminder_previews` insert; order state/version remain unchanged | Implemented |
| Odoo's mail/chatter delivery and exact toaster widget | Core3 records the preview in the existing chatter datasource; no external mail delivery is claimed | Bounded follow-up |
| Authenticated desktop/mobile visual comparison | No captures | Blocked by BrowserSkill borrow confirmation |
