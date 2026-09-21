# Gap matrix

| Gap | Required change | Evidence/result |
| --- | --- | --- |
| Invoice detail had no Preview action | Add page/API-matched navigation and state guard | focused preview test pass |
| No read-only preview page | Add real persisted preview datasource and OdooFormView portal banner | focused preview test pass; route listed by `/api/modules` |
| Preview Download needed to reuse existing PDF artifact | Add page-local client action calling existing Accounting PDF source | contract validated; PDF regression pass |
| Core3 authenticated browser capture unavailable | Reuse no credentials; record `/auth/login` redirect and retain Odoo captures | blocker recorded in `verification.md` |
| Portal Pay Now/share/chatter integration absent | Keep outside bounded slice and schedule follow-up | not claimed complete |
