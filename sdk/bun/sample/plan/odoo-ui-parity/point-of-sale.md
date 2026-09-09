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
self-order, sessions, and workflows. Existing routes include
`/point-of-sale/cashier`, `/point-of-sale/orders`, `/point-of-sale/payments`,
`/point-of-sale/invoices`, `/point-of-sale/cash-movements`,
`/point-of-sale/configs`, and `/point-of-sale/analysis`. The current batch adds
data-backed Customers, Products, Payment Methods, Session Report, and Sales
Details routes with convention-discovered API fragments.

The current follow-up adds a configuration detail side panel and a settings
form. Authenticated browser verification confirms `/point-of-sale/configs`,
double-click navigation to `/point-of-sale/config-detail?id=pos-config-main`,
and `/point-of-sale/configuration-coverage` render with fixture data.

The dashboard batch adds `/point-of-sale` as the direct counterpart to Odoo
`/odoo/point-of-sale`, using service-owned configuration fixtures, card/list
view switching, search, and an authenticated Open Register action. Desktop and
mobile captures are kept as local comparison evidence.

The dashboard comparison found one shared CardView action propagation defect;
ListView now forwards its action handler into CardView, and an authenticated
card click is verified to navigate to `/point-of-sale/cashier?config_id=...`.

The configuration-menu batch adds authenticated fixture-backed routes for
Preparation Printers, Note Models, Coins/Bills, and Presets. Desktop/mobile
browser smoke checks verified 3, 3, 6, and 3 rows respectively; comparison
captures remain temporary local evidence.

The product-catalog batch adds the five remaining Odoo product submenu routes:
Combo Choices, Pricelists, PoS Product Categories, Attributes, and Product Tags.
Each route is a `ListView` backed by the convention-discovered
`pos-product-catalog.yaml` API fragment and migration `011`, with search and an
Active/Archived filter. Fixtures intentionally mirror the visible Odoo list
columns: combo choice/product/category/extra price, pricelist name/country
groups/company, category/parent/sequence, attribute/display type/variant
creation, and tag/color/product count.

## Remaining parity work

Add explicit menu/page coverage for the remaining Odoo POS product forms and
the touch-selling dashboard/session.
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
- Product-catalog list routes render deterministic fixture rows, support bounded
  search/filter interactions, and remain service-owned without page-local
  records.
- Authenticated desktop/mobile checks cover lists, forms, touch selling,
  payment/session modals, settings, empty/error/permission states.
- `bun run audit` passes with no POS route silently resolving elsewhere.
- Commits contain YAML/TS/docs only; screenshots remain local evidence and are
  never committed.
