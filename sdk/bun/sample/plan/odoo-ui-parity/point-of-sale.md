# Point of Sale — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `point_of_sale`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify manifest demo files; use demo products, POS settings, and orders when provided.
- Core3 service: `point-of-sale`.

## Menu, action, and view inventory

- POS dashboard, sessions, orders, payments, products, and configurations.
- POS session opening screen, register/product grid, categories, search, cart, customer selection, quantity/discount dialogs, payment screen, receipt/validation, and closed-session state.
- Backend order/session list and form: state, cashier, lines, payments, totals, refund action, and chatter/attachments where shown.
- Reporting: orders, sales details, payment methods, and session summaries.
- Mobile product grid, cart drawer, keypad, payment dialog, receipt, and offline/empty product states.

## Core3 backend mock-data coverage

Declare `pos_configs`, `pos_sessions`, `pos_products`, `pos_categories`, `pos_taxes`, `pos_customers`, `pos_orders`, `pos_order_lines`, `pos_payments`, `pos_payment_methods`, `pos_receipts`, and `pos_reports`. Include open/closing/closed sessions, populated/empty/search product grids, cart, payment success/error, refund, offline, mobile, and report states. Fixtures must contain images/placeholders, prices, taxes, stock badges, cashier, sequence/receipt numbers, tendered/change amounts, and currencies. Keep datasource IDs query-swappable.

## Shared UI primitives

Shell, dashboard cards, kanban/list, product tiles, category tabs, search, cart/one2many lines, numeric keypad, payment/receipt dialogs, status badges, pager, notifications, and responsive touch layout.

## Screenshots and acceptance checks

Capture `/odoo/point-of-sale` dashboard/backend at 1440x900 and 390x844; capture the POS register at both sizes when the Odoo route allows it. Check product/category ordering, cart arithmetic, payment states, session controls, receipt, mobile touch layout, fixture-backed offline rendering, and non-blank reports before `ready`.
