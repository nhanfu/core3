# Gap matrix

| Stable ID | Gap | Implementation | Boundary |
| --- | --- | --- | --- |
| ACC-INVOICE-CANCEL-001 | Detail Cancel action was missing; existing list declaration had no executable mutation | Page/API action pair plus guarded `accounting_invoices` Draft → Cancelled workflow | Odoo live visual comparison blocked by tab-borrow confirmation |
| ACC-INVOICE-CANCEL-002 | Posted cancellation requires Odoo reset/reconcile side effects | Existing Core3 Reset to Draft remains the explicit prerequisite | Payment/reconciliation side effects are not expanded in this bounded slice |
