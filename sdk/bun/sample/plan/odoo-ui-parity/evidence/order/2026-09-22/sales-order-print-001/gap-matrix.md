# Gap matrix

| Gap | Implementation | Evidence |
| --- | --- | --- |
| Missing Sales form Print action | Add `print_sale_order` to the existing YAML form and API action contract | Focused mapping test |
| No durable report-run record | Add idempotent `sale_order_print_runs` schema and datasource | Restart/replay test |
| No explicit print boundaries | Add missing, branch, state/row-version, actor, and atomic insert guards | Guard test |
| No visual proof | Borrowing signed-in Odoo tab did not complete | `browser-blocker.txt`; no parity claim |
