# Source comparison

## Odoo

Local Odoo 19 source was inspected under `/home/nhanjs/projects/odoo`:

- `addons/account/views/account_payment_view.xml` declares
  `account_send_payment_receipt_by_email_action` with the exact label
  `Send receipt by email`, `res_model` `mail.compose.message`, `form` mode,
  `target` `new`, the payment receipt template, and the Accounting invoice
  group.
- `addons/account/data/mail_template_data.xml` defines
  `mail_template_data_payment_receipt`, a payment receipt subject/body, and
  the `account.action_report_payment_receipt` attachment report.
- `addons/mail/wizard/mail_compose_message_views.xml` provides the composer
  `Send` and `Discard` controls, recipient, subject, body, and attachments.

## Core3 gap and bounded mapping

Before this change, Core3 had a read-only Accounting payment detail datasource
and no receipt action, composer fields, receipt history, or durable outbox.
The page remains layout-only and `api/payment-detail.yaml` now owns the
`page.id`-matched datasource and permissioned server-form action. The mutation
validates a processed payment, recipient, subject, body, actor, expected row
version, and payment existence before inserting a `Queued` receipt and
incrementing the durable payment receipt counter atomically.

Core3 intentionally does not claim SMTP delivery, Odoo's mail queue worker,
or generated payment-receipt PDF bytes in this bounded feature.
