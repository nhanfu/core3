# Point of Sale UI parity

Status: in-progress

## Reference gate

- Odoo addon/version: `point_of_sale`, Odoo 19 Community.
- Official demo data: enabled in the fresh `core3_demo` database at
  `http://localhost:8069`.
- Reference credentials are maintained outside the repository.
- Visible Odoo menu families: Dashboard; Orders (Customers, Orders, Payments,
  Sessions, Preparation Printers); Reporting (Session Report, Sales Details);
  Configuration (Settings, Note Models, Point of Sales, Coins/Bills, Presets,
  Taxes, Payment Methods); Products (Products, Product Variants, Combo Choices,
  Pricelists, PoS Product Categories, Attributes, Product Tags).

## Existing Core3 surface

The existing `point_of_sale` service already provides YAML/API contracts for
cashier, orders, payments, invoices, cash movements, configuration, analysis,
customer display, discount, HR, loyalty, online payment, repair, restaurant,
self-order, sessions, and workflows. Existing routes include `/point-of-sale/
cashier`, `/point-of-sale/orders`, `/point-of-sale/payments`,
`/point-of-sale/invoices`, `/point-of-sale/cash-movements`, `/point-of-sale/configs`,
and `/point-of-sale/analysis`.

## Remaining parity work

Add explicit menu/page coverage for the Odoo POS Customers, Preparation
Printers, Session Report, Sales Details, Note Models, Coins/Bills, Presets,
Taxes, product catalog submenus, and the touch-selling dashboard/session.
Capture and implement configuration forms, payment/tender modals, session
open/close controls, product/customer dialogs, error/empty states, responsive
desktop/mobile composition, and permission-denied states.

## Shared primitives and fixtures

Use the existing POS cashier, `ListView`, `OdooFormView`, `StatRow`, `Chart`,
`StatusBar`, modal, and responsive primitives. Every new page must bind to a
service-owned datasource/API fixture; no page-local hard-coded records or
images are permitted.

## Acceptance

- Every listed Odoo menu has an explicit Core3 route or a documented deliberate
  redirect.
- Authenticated desktop/mobile checks cover lists, forms, touch selling,
  payment/session modals, settings, empty/error/permission states.
- `bun run audit` passes with no POS route silently resolving elsewhere.
- Commits contain YAML/TS/docs only; screenshots remain local evidence and are
  never committed.
