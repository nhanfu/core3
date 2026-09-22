# Source comparison

| Odoo behavior | Current Core3 before this feature | Bounded change | Classification |
| --- | --- | --- | --- |
| `account.move` form/chatter reloads when an attachment is added | `invoice-detail.yaml` had messages but no attachment source or upload/download actions | Add shared OdooFormView attachment panel joined to `api/invoice-detail.yaml` | missing → implemented |
| Attachments are durable `ir.attachment` rows linked to `account.move` | No invoice attachment table or migration existed | Add `accounting_invoice_attachments` migration/table with deterministic fixture | missing → implemented |
| Attachment upload is an authenticated invoice-form operation | No Accounting invoice upload action or storage kind existed | Add `accounting.write` `attachment_metadata` upload with actor, size, duplicate, missing, and stale guards | missing → implemented |
| Attachment read/download is protected | Only bank-statement and invoice-PDF storage kinds existed | Add `accounting_invoice_attachment` storage route requiring `accounting.read` | missing → implemented |
| Chatter records the attachment event | Invoice messages existed for send/message/note/activity only | Add durable `Uploaded attachment` message row in the same invoice message source | partial → implemented |
