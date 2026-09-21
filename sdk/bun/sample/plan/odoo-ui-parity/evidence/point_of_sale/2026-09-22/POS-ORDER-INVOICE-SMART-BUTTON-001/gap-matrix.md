# Gap matrix

| ID | Gap | Implementation | Evidence |
| --- | --- | --- | --- |
| G1 | Order detail had no linked Invoice smart button | Add page header action and `invoice_id` visibility guard | Contract test |
| G2 | No linked invoice destination | Add separate page/API pair with matching `page.id` | Audit + contract test |
| G3 | No company-scoped invoice projection | Join `pos_invoices` to `pos_orders` and require current company | Datasource boundary test |
| G4 | No positive durable fixture | Add idempotent Invoiced order and Posted invoice migration | Restart/replay test |
| G5 | Odoo positive browser state unavailable | Record four un-invoiced reference orders and Core3 401 | `verification.md` |
| G6 | Responsive authenticated Core3 proof unavailable | Preserve explicit blocker; do not claim visual parity | `verification.md` |
