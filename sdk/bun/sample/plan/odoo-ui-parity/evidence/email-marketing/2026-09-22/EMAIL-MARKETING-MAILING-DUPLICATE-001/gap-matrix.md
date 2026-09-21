# Gap matrix

| ID | Gap | Implementation | Evidence |
| --- | --- | --- | --- |
| DUP-001 | Missing completed-mailing duplicate action | `api/mailing-detail.yaml`, `pages/mailing-detail.yaml` | `DUP-FUNC-001`, `DUP-WF-001` |
| DUP-002 | No durable copy/reset contract | Same API mutation plus existing `email_mailings` table | `DUP-DATA-001`, `DUP-PERSIST-001` |
| DUP-003 | No permission/error boundary | `email_marketing.write`, guards, optimistic source version | `DUP-SEC-001`, `DUP-ERR-001` |
| DUP-004 | No responsive proof | Core3 bsk captures if runtime is available | `verification.md` |
| DUP-005 | Odoo live action unavailable | Exact authenticated app-menu blocker | `odoo-analysis.md`, `verification.md` |
