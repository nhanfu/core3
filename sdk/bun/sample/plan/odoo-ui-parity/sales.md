# Sales (orders) — sub-plan

Status: `ready`

## Reference and availability

- Odoo addon/version: `sale_management` (with `sale`), Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify the `sale_management` manifest's demo declaration; retain official demo products/orders where available.
- Core3 service: `order`.

## Menu, action, and view inventory

- Sales dashboard, Quotations, Sales Orders, Customers, Products, and Pricelists.
- Quotation/order list with search, filters, group-by, list/kanban switch, pager, mass actions, and empty state.
- Quotation/order form: quotation/sale status bar, customer, order lines, taxes, discounts, delivery/invoice addresses, totals, optional products, signature/payment actions, activities, and chatter.
- Product and pricelist relational popovers; confirmation, cancel, reset-to-quotation, and send-by-email dialogs.
- Reporting: Sales, Salespersons, Products, and graph/pivot/list variants.
- Mobile order cards, line editor, sticky totals, and overflow actions.

## Core3 backend mock-data coverage

Declare `sales_orders`, `sales_order_lines`, `sales_customers`, `sales_products`, `sales_taxes`, `sales_pricelists`, `sales_activities`, `sales_attachments`, and `sales_report` in backend datasource YAML. States must cover quotation, confirmed, cancelled, empty, filtered/grouped/paginated lists, draft form, line-add/product selector dialog, mobile form, and report. Include units, prices, discounts, tax labels/rates, currencies, delivery dates, addresses, payment/signature flags, and chatter. Preserve IDs when swapping each `mock_data` provider for a later `query`.

## Shared UI primitives

Shell/control panel/search/pager, list and kanban, relational selectors, editable one2many order lines, monetary/tax renderers, status bar, dialog, activity/chatter, report graph/pivot, notifications, and responsive form layout.

## Screenshots and acceptance checks

Capture `/odoo/sales` (quotations/orders) and every listed action at 1440x900 and 390x844, with draft, confirmed, cancelled, empty, and report states. Validate totals against fixture lines, menu/action parity, form tabs and buttons, mobile line editing, deterministic offline rendering, and datasource completeness before `ready`.
