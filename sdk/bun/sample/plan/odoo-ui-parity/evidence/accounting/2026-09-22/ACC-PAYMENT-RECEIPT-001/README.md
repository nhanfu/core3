# ACC-PAYMENT-RECEIPT-001 — Send receipt by email

Bounded Accounting parity evidence for Odoo's form-bound
`account_send_payment_receipt_by_email_action`.

- Core3 contract: `/accounting/payment-detail?id=accounting-payment-demo-001`
- Stable action: `send_accounting_payment_receipt`
- Odoo action: `account_send_payment_receipt_by_email_action`
- Odoo model: `mail.compose.message`, form target `new`
- Core3 persistence: `accounting_payment_receipts`, `receipt_count`, and
  `last_receipt_sent_at`
- Core3 delivery state: a durable `Queued` local outbox record; SMTP delivery,
  report rendering, and external attachment transport are outside this slice.

The focused integration suite proves source mapping, page/API binding, queued
receipt persistence, email/content validation, permission ownership through the
action contract, stale/missing guards, and DuckDB close/reopen persistence.

BrowserSkill was connected to browser instance `245ea108`, but the shared
authenticated Odoo tab could not be borrowed because its confirmation remained
pending and the borrow command ended with a timeout. No Odoo desktop/mobile
capture was possible and this feature makes no visual-parity claim.
