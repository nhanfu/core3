# Source comparison

| Odoo 19 contract | Core3 Order implementation | Result |
| --- | --- | --- |
| Editable Sales order exposes Discount action | `LineItemGrid.actions` exposes permissioned `Discount` action for quotation/sent states | mapped |
| Wizard modes: all lines, global, fixed | API `server_form` radio values `sol_discount`, `so_discount`, `amount` | mapped |
| Percentage validation | 0–100 validation with 422 guard | mapped |
| Global/fixed discount product line | Durable `product-demo-discount` migration seed and negative line total | mapped |
| Order totals and line totals recompute | Mutation updates line/order totals and row versions | mapped |
| Locked/stale/scope protections | Permission, branch, status, and expected-version guards | mapped |
| Wizard persistence | DuckDB-backed order lines, orders, audit activity, migration replay | covered by integration test |
| Odoo browser layout | Core3 browser capture | blocked: local 3001/3002 unavailable |
