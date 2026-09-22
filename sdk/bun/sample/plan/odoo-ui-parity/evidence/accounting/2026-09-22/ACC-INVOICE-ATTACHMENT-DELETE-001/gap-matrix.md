# Gap matrix

| Stable ID | Core3 source | Change | Dependency | Evidence |
| --- | --- | --- | --- | --- |
| ACC-INVOICE-ATTACHMENT-DELETE-001 | `services/accounting/pages/invoice-detail.yaml`, `api/invoice-detail.yaml` | Add permissioned attachment Remove action | Existing OdooFormView attachment panel and invoice attachment table | Focused test and verification |
| ACC-INVOICE-ATTACHMENT-DELETE-001-DATA | `accounting_invoice_attachments`, `accounting_invoices` | Soft-deactivate child, increment child and parent versions, add chatter row | Existing attachment migration and invoice message table | Migration fixture assertions |
| ACC-INVOICE-ATTACHMENT-DELETE-001-SECURITY | API mutation guards and `accounting.write` | Actor, parent-version, child-version, relation, and active-state checks | Core3 permission contract | Guard test cases |
