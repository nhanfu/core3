# Source comparison

| Odoo contract | Existing Core3 before this slice | Result |
| --- | --- | --- |
| `Print` header action on `sale.order` | Sales form had Send/Confirm/Invoice/Cancel/Preview, but no Print action | Implemented as `print_sale_order` |
| `sale.action_report_saleorder` → `Quotation / Order` QWeb PDF | No Sales print action or print history datasource | Implemented with durable `sale_order_print_runs` |
| Print allowed outside confirmed `sale` state | Existing status mapping is Quotation/Sent/Sales Order/Cancelled | Guarded Draft/Pending Approval/Cancelled; rejects Approved |
| Report is readonly | No existing mutation | Print history records the event; order status/version are unchanged |
