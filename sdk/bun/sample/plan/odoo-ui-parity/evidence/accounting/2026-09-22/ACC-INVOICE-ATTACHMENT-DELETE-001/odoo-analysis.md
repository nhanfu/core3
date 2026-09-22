# Odoo analysis

- Odoo 19 source: `addons/account/static/src/components/mail_attachments/mail_attachments.js:35-51` removes a normal attachment from the form value and queues its ID for unlink.
- The component performs `orm.unlink("ir.attachment", ids)` on cleanup at `:54-66`.
- `addons/account/models/ir_attachment.py:20-40` applies the restricted-audit-trail guard before destructive attachment changes for protected posted PDF/XML records.
- The invoice form declares `attachment_ids` and the chatter reloads on attachment changes; this is an invoice-form capability rather than a standalone menu action.

The bounded Core3 contract therefore adds a row action to the existing invoice
attachment panel. It uses an inactive state for recoverable local auditability
and does not claim the Odoo storage unlink or restrictive audit-trail policy.
