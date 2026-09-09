# Purchase — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `purchase`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify manifest demo data; use demo vendors, products, tenders, and purchase orders where available.
- Core3 service: `purchase`.

## Menu, action, and view inventory

- Purchase dashboard, Requests for Quotation, Purchase Orders, Vendors, Products, Reporting, and Configuration.
- RFQ/order list/kanban with draft/sent/to approve/purchase/done/cancelled, search/filter/group/pager, and batch actions.
- RFQ/order form: vendor, order lines, taxes, planned date, receipt/billing status, vendor reference, confirm/send/cancel/lock, activities, attachments, and chatter.
- Product/vendor forms, purchase analysis graph/pivot/list, and mobile line editor/overflow.

## Core3 backend mock-data coverage

Declare `purchase_orders`, `purchase_order_lines`, `purchase_vendors`, `purchase_products`, `purchase_taxes`, `purchase_receipts`, `purchase_bills`, `purchase_activities`, and `purchase_report`. Cover every order state, approval, receipt/billing status, empty/filter/group/pagination, product/vendor dialogs, mobile, and report states. Include currencies, units, prices, taxes, dates, addresses, chatter, and attachments; datasource IDs must later accept `query`.

## Shared UI primitives

Shell/control panel/search/pager, list/kanban/form, editable order lines, relational selectors, monetary/tax fields, status bar, attachments/chatter, dialogs, graph/pivot, and responsive layout.

## Screenshots and acceptance checks

Capture `/odoo/purchase` and all listed actions at 1440x900 and 390x844. Validate order totals, state/status controls, vendor/product relationships, report totals, mobile editing, fixture completeness, and backend-offline rendering before `ready`.
