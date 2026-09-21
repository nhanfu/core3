# Gap matrix

| ID | Gap | Implementation | Acceptance evidence |
| --- | --- | --- | --- |
| G1 | Source detail has no Refunds action | Add page header action, API navigate action, and count visibility guard | Contract test + authenticated source-order capture |
| G2 | Refund detail has no reverse relationship action | Add page header action using `original_order_id` | Contract test + authenticated refund-detail capture |
| G3 | No filtered related-order list | Add separate page/API YAML with matching ID, search/filter, current-company query | Datasource contract test + list capture |
| G4 | No stable related refund fixture | Migration 051 inserts one linked refund and line idempotently | Migration replay/restart test |
| G5 | Unauthorized/cross-company behavior not declared | Add datasource error states and SQL company/order scoping | Permission/company/empty tests |
| G6 | Responsive/UI evidence absent | Exercise Odoo and Core3 detail/list at desktop/mobile | `verification.md`, screenshots or exact blocker |
