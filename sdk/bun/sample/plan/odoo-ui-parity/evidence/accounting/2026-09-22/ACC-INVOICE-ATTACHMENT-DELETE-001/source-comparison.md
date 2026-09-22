# Source comparison

| Odoo behavior | Core3 change | Classification |
| --- | --- | --- |
| Invoice attachment widget removes ordinary `ir.attachment` rows through `unlink` | Add page/API-matched `remove_accounting_invoice_attachment` line-item action | missing -> implemented |
| Removal is an authenticated Accounting form operation | Require `accounting.write` and a non-empty actor | missing -> implemented |
| Attachment and parent records can change concurrently | Guard child and parent `row_version` values before each update | missing -> implemented |
| Chatter reflects the attachment removal | Insert a durable `Removed attachment` invoice message | missing -> implemented |
| Odoo removes the attachment storage row | Core3 marks the row inactive so it is hidden and non-downloadable | partial |
| Restricted audit-trail unlink rules | Not implemented in this bounded slice | missing / follow-up |
