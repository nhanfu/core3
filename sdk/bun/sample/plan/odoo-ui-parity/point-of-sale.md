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

The POS Taxes comparison was recaptured after rebuilding the ignored global and
POS styles; authenticated desktop/mobile checks show all four tax rows with no
unexpected failures or horizontal overflow. Corrected Core3 captures are
`/tmp/core3-pos-{desktop,mobile}-taxes-recaptured.png`.

The product-catalog batch adds the five remaining Odoo product submenu routes:
Combo Choices, Pricelists, PoS Product Categories, Attributes, and Product Tags.
Each route is a `ListView` backed by the convention-discovered
`pos-product-catalog.yaml` API fragment and migration `011`, with search and an
Active/Archived filter. Fixtures intentionally mirror the visible Odoo list
columns: combo choice/product/category/extra price, pricelist name/country
groups/company, category/parent/sequence, attribute/display type/variant
creation, and tag/color/product count.

The session parity batch adds the explicit Sessions menu and corrects session
detail navigation. The Sessions list is backed by the service-owned session
API, includes bounded status filtering and state-aware open/start-closing/
close-post controls, and opens the shared POS session form. Session detail
uses the shared OdooFormView status bar, cash-control fields, cash movements,
orders, and operation log. The lifecycle workflow now persists counted cash,
expected cash, differences, and discrepancy reason on close. Deterministic
fixtures cover Opening Control, In Progress, Closing Control, and Closed &
Posted, while the existing cashier route remains the touch-selling surface
with its active-session and open-ticket state.
## Current batch: product and customer forms

The Odoo Products and Customers surfaces were captured at 1440x900 and 390x844.
Core3 now adds row-open/double-click navigation from `/point-of-sale/products`
and `/point-of-sale/customers` to service-owned Product and Customer forms,
including related POS orders for a customer. Authenticated checks verified both
lists and both detail routes at desktop and mobile sizes with zero unexpected
responses and no horizontal overflow. Odoo captures are under
`/tmp/odoo-pos-{desktop,mobile}-{products,customers}.png`; Core3 captures are
under `/tmp/core3-pos-{desktop,mobile}-{products,product-detail,customers,customer-detail}.png`.

## Remaining parity work

The live Odoo Settings action is action 463 and was captured at both target
viewports. Core3 now exposes the canonical `/point-of-sale/settings` menu route
with SettingsView tabs for General Settings and Point of Sale, including
payment, cash-control, interface, employee-login, and restaurant controls.
Authenticated checks verified tab switching, zero unexpected responses, and no
horizontal overflow. Odoo captures are `/tmp/odoo-pos-{desktop,mobile}-settings.png`;
Core3 captures are `/tmp/core3-pos-{desktop,mobile}-settings.png`.

The live POS action audit resolved Payment Methods to action 479 and captured
its list/kanban surfaces at both target viewports. Core3 now supports row-open
and double-click navigation from `/point-of-sale/payment-methods` to a service-
owned payment-method form. Authenticated checks verified list and detail states
with no unexpected responses or horizontal overflow. Odoo captures are under
`/tmp/odoo-pos-{desktop,mobile}-payment-methods.png`; Core3 captures are under
`/tmp/core3-pos-{desktop,mobile}-payment-{methods,detail}.png`.

The cashier workflow was audited in an isolated all-memory runtime at desktop
and mobile sizes. Authenticated browser evidence covers New ticket with an open
session lookup, Add to ticket for House coffee, and Register payment using Cash.
The resulting order appears in POS Orders as Paid with total 3.85, paid 3.85,
tax 0.35, and payment method Cash. Core3 captures are kept locally under
`/tmp/core3-pos-cashier-desktop-{initial,new-ticket,product-added,paid,order-paid}.png`
and `/tmp/core3-pos-cashier-mobile.png`.
An authenticated dispatcher session without `pos.write` receives the expected
403 page-load response and the visible Failed to load page state.

The audit fixed three shared/runtime gaps found by the browser: direct Bun
component fallback registration for native form fields, lookup propagation and
refresh for list-created server forms, and two-decimal POS payment inputs.
Mobile stat cards now collapse to two columns and the list root contains table
header overflow while preserving its internal horizontal viewport. The cashier
surface remains in-progress pending additional empty/error-state coverage and a
fresh Odoo touch-session comparison.

The Odoo touch dashboard and Furniture Shop selling session were captured at
1440x900 and 390x844, including the opening-control modal and responsive product
grid. Core3 now exposes `/point-of-sale/touch` through the dashboard register
action and renders the shared `PosShell` with the active session, service-owned
products, open tickets, cart, and payment affordance. Authenticated browser
checks verified the route at both viewports with zero unexpected responses and
no horizontal overflow. Odoo captures are `/tmp/odoo-pos-{desktop,mobile}-touch-{dashboard,selling}.png`;
Core3 captures are `/tmp/core3-pos-touch-shell-final-{desktop,mobile}.png`.

Remaining work is focused on additional configuration forms, payment/tender
modals, and broader empty/error-state coverage across the already implemented
POS routes. Session open/close controls, product/customer forms, responsive
desktop/mobile composition, permission-denied behavior, and the touch-selling
dashboard/session now have implementation and captured browser evidence.

The product-catalog batch adds the five remaining Odoo product submenu routes:
Combo Choices, Pricelists, PoS Product Categories, Attributes, and Product Tags.
Each route is a `ListView` backed by the convention-discovered
`pos-product-catalog.yaml` API fragment and migration `011`, with search and an
Active/Archived filter. Fixtures mirror the visible Odoo list columns for
choices, pricelists, categories, attributes, and tags.

Authenticated Core3 checks at 1440x900 and 390x844 loaded all five catalog
routes with 4-5 deterministic rows, no unexpected failed responses, and no
horizontal overflow. Captures are under `/tmp/core3-pos-{desktop,mobile}-*`
for the five catalog routes; corresponding Odoo reference captures remain
under `/tmp/odoo-pos-*`.

The session lifecycle batch adds status filtering, closing-balance visibility,
and permissioned Open, Start Closing, and Close & Post row actions. Its guarded
workflow records counted cash, expected cash, discrepancy, and close time; the
focused integration test covers the session transition contract.

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
