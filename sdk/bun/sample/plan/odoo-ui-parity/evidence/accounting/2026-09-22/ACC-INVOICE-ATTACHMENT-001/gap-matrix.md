# Gap matrix

| Stable ID | Odoo menu/action | Core3 source | Gap/change | Dependency | Test/evidence |
| --- | --- | --- | --- | --- | --- |
| ACC-INVOICE-ATTACHMENT-001 | Invoicing → Invoices → `account.move` form/chatter; no standalone action | `services/accounting/pages/invoice-detail.yaml`, `api/invoice-detail.yaml`, `storage.yaml` | Add durable invoice attachment list/upload/download contract and event | Shared OdooFormView attachment primitive; Accounting read/write permissions | `accounting_invoice_attachments.integration.test.ts`; this folder |
| ACC-INVOICE-ATTACHMENT-001-DATA | `ir.attachment` linked to `account.move` | No table/migration | Add migration `20260922230000-056-accounting-invoice-attachments.yaml` and idempotent fixture | Accounting invoice foundation | Focused restart/migration assertions |
| ACC-INVOICE-ATTACHMENT-001-UI | Invoice form attachment/chatter panel | Message-only invoice form | Bind attachment labels, source, upload/download action IDs | `page.id: invoice-detail` | Contract test; visual case blocked |
