# Source comparison

Odoo 19 `purchase.order.action_rfq_send()` opens `mail.compose.message`,
selects the RFQ email template for Draft/Sent orders, and supplies the order
record and report attachment context. The Purchase form view exposes the
action only for RFQ states. Core3 implements the bounded equivalent as a
page/API-matched `server_form` action with editable recipient, subject, body,
and attachment metadata, then persists a sent-message record and transitions
Draft to Sent. Confirmed-order `Send PO` remains unimplemented by design for
this slice.
