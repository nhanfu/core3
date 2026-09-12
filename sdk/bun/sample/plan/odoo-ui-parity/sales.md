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

## Current batch evidence

- Core3 authenticated routes: `/order/quotations/`, `/order/sales-orders/`, `/order/reporting/sales/`.
- Core3 captures: `/tmp/core3-odoo-parity/integrated-20260909/quotations-desktop.png`, `quotations-mobile.png`, `sales-orders-desktop.png`, `sales-orders-mobile.png`, `sales-reporting-desktop.png`, and `sales-reporting-mobile.png`.
- Odoo captures: `/tmp/odoo-sales-quotations-desktop.png`, `odoo-sales-quotations-mobile.png`, `odoo-sales-orders-list-desktop.png`, and `odoo-sales-reporting-desktop.png`.
- Verified: authenticated menu routes, populated quotation/order/report lists, reporting graph/pivot/list tabs, and responsive mobile rendering.

## Current batch: Sales Analysis By Customers

- Odoo 19 source action: `sale.action_order_report_customers` / action `717`, model `sale.report`, with `graph,pivot` views, default Customer grouping, and the `Order Date: Last 365 Days` search facet.
- Odoo authenticated captures: `/tmp/odoo-sales-customers-desktop-reference.png` and `/tmp/odoo-sales-customers-mobile-reference.png`.
- Core3 route: `/order/reporting/customers`, owned by `sale-reporting-customers`; its page/API fragments join by `page.id` and the reporting menu entry is permissioned by `orders.read`.
- Core3 behavior: Odoo-shaped customer bar graph and pivot, Qty Ordered default measure, fixed date range/search facets, deterministic customer/order/line fixtures, read-only report semantics, empty-state rendering, and transport-error contract.
- Verification: `bun test test/sales_customer_report.integration.test.ts` (3 pass, 25 assertions), GraphView/PivotView client tests (12 pass), UI audit (362 pages, 366 routes, 641 datasources), and `git diff --check` all pass. Authenticated Core3 desktop/mobile captures are `/tmp/core3-sales-customers-desktop-final-20260910.png` and `/tmp/core3-sales-customers-mobile-final-20260910.png`; Odoo references remain `/tmp/odoo-sales-customers-desktop-reference.png` and `/tmp/odoo-sales-customers-mobile-reference.png`. Runtime evidence covers populated, search-empty, forced-empty, pivot, and anonymous permission-boundary states; desktop `1440/1440` and mobile `390/390` report/body widths have no horizontal overflow and browser response/page/console failure lists are empty. Deferred Odoo report list view is intentional because action `717` exposes only graph and pivot.

## Next bounded slice: Sales order form

- Added dedicated `/order/sale-order` form and `sale-order-detail` page/API fragment; quotation and confirmed-order rows no longer open the generic logistics `/order/detail` form.
- Odoo source/reference contract: `sale/views/sale_order_views.xml` supplies `Send`, `Confirm`, `Create Invoice`, `Cancel`, `Set to Quotation`, the `Quotation`/`Sent`/`Sales Order` status progression, customer/order detail fields, `Order Lines`, and `Other Information` tabs.
- Core3 form coverage: deterministic order/line/status/timeline sources, product selector/add-product action, total, exact labels, editable quotation fields, `orders.write`/`orders.approve` boundaries, and 409 stale/invalid-state plus 400 unavailable-product guards.
- Final evidence: authenticated Odoo references are `/tmp/odoo-sales-order-form-desktop-final.png` and `/tmp/odoo-sales-order-form-mobile-final.png`; Core3 captures are `/tmp/core3-sales-order-form-desktop-final-1440x900.png`, `/tmp/core3-sales-order-form-desktop-sent-1440x900.png`, `/tmp/core3-sales-order-form-desktop-confirmed-1440x900.png`, `/tmp/core3-sales-order-form-desktop-cancelled-1440x900.png`, and `/tmp/core3-sales-order-form-mobile-final-390x844.png`. Authenticated smoke covered Draft -> Quotation Sent -> Sales Order -> Cancelled; focused integration tests passed (4 tests, 32 assertions), the UI audit passed, and `git diff --check` passed. The compact mobile capture has no horizontal overflow; order lines remain below the first 844px viewport and are available in `/tmp/core3-sales-order-form-mobile-final-full.png`. Odoo-only Print/Preview/Quote Builder controls remain outside this bounded order-service slice.

## Current batch: Sales Analysis By Salespersons

- Odoo 19 source action: `sale.action_order_report_salesperson`, with `Sales Analysis By Salespersons` title, bar graph and pivot view modes, default Salesperson grouping, and the `Order Date: Last 365 Days` search facet.
- Core3 route: `/order/reporting/salespersons`, owned by `sale-reporting-salespersons`; page and API fragments join by `page.id`, and the manifest menu remains permissioned by `orders.read`.
- Core3 behavior: salesperson aggregate rows with Orders, Qty Ordered, Total, and Average Order measures; graph/pivot views; salesperson search and fixed date-range filters; deterministic named salesperson fixtures; read-only semantics; empty-state and transport-error contracts.
- Verification: `bun test test/sales_salespersons_report.integration.test.ts` passes (3 tests, 31 assertions), the Sales regression passes (12 tests, 117 assertions), the UI audit passes (401 pages, 407 routes, 703 datasources), and `git diff --check` passes. Authenticated headless Chrome exercised the populated graph, salesperson search, pivot switch, empty state, and 1440x900/390x844 no-horizontal-overflow checks with no console/page/request failures. The transport-error URL currently exposes a shared page-schema limitation (`datasources[0].error is not allowed`), so that state is covered by the repository contract test but not claimed as browser-rendered; screenshots remain outside Git.

## Quotation Templates bounded slice (2026-09-12)

The next uncovered Sales Configuration action is Odoo `sale.mail_template_menu`, Quotation Templates. Core3 adds `/order/quotation-templates` and its detail route, with separate page/API YAML joined by `page.id`, deterministic template fixtures, manager CRUD, archive/restore, stale-write and missing-record guards, and the Odoo list/form labels and menu placement. The focused test passes 2 tests and 21 assertions.

Authenticated Odoo list captures are under `/tmp/core3-odoo-parity/sales-next-20260912/odoo-quotation-templates-desktop.png` and `odoo-quotation-templates-mobile.png`. A paired Core3 capture was not completed before the isolated runtime pass ended, so no visual parity claim is made for this slice; screenshots remain outside Git and the browser gate stays open for the next continuation.

### Form completion in sales-batch2

The local Odoo source trace is `sale_management/views/sale_management_menus.xml` (Configuration > Quotation Templates, sequence 1, group `sale_management.group_sale_order_template`) and `sale_order_template_views.xml`: `sale_order_template_action` uses model `sale.order.template`, view mode `list,form`, with the search fields `name`, Archived filter, and Company group-by for `base.group_multi_company`. The form exposes Quotation Template, Quotation Validity, Confirmation Mail, Company, Invoicing Journal, Online Signature, Online Payment, Prepayment percentage, Lines, and Terms & Conditions. The Lines one-to-many supports Add a product, Add a section, Add a note, sequence ordering, Product, Description, Quantity, Unit, and Optional Product; manager CRUD is granted by `sale_management/security/ir.model.access.csv`, while salesmen retain read-only access.

This batch extends the existing route without adding a duplicate menu: the separate `sale-quotation-template-detail` API now carries the form settings and a deterministic `sale_quotation_template_lines` source, with guarded line creation/deletion and existing row-version template edits/archive/restore. The migration is idempotent and uses fixed defaults/fixtures. Focused contract coverage includes populated, filtered, empty, transport-error, forbidden-by-permission contract, validation, missing-record, stale-write, and template/line CRUD paths. The persistent `js_repl` required by the playwright-interactive skill was unavailable in this session; Core3 therefore has no authenticated 1440x900 or 390x844 captures for the form completion, and no visual parity claim is made. Odoo references remain the captures listed above; all image artifacts stay outside Git.

## Quotation Templates visual comparison (2026-09-12)

This continuation completed the paired Core3 visual pass for the bounded Quotation Templates slice. The built frontend was served from this worktree on an isolated local port; authenticated Core3 navigation covered the populated list and the `Office Furnitures` detail with its Lines grid at both requested viewports. The rendered YAML contract matches the Odoo reference data and labels without a source-backed correction required.

| Surface | Viewport | Capture |
| --- | --- | --- |
| Odoo reference list | 1440x900 | `/tmp/core3-odoo-parity/sales-visual4-20260912/odoo-quotation-templates-desktop.png` |
| Odoo reference list | 390x844 | `/tmp/core3-odoo-parity/sales-visual4-20260912/odoo-quotation-templates-mobile.png` |
| Core3 list | 1440x900 | `/tmp/core3-odoo-parity/sales-visual4-20260912/core3-quotation-templates-desktop.png` |
| Core3 list | 390x844 | `/tmp/core3-odoo-parity/sales-visual4-20260912/core3-quotation-templates-mobile.png` |
| Core3 detail | 1440x900 | `/tmp/core3-odoo-parity/sales-visual4-20260912/core3-quotation-template-detail-desktop.png` |
| Core3 detail | 390x844 | `/tmp/core3-odoo-parity/sales-visual4-20260912/core3-quotation-template-detail-mobile.png` |

Core3 browser evidence: both viewports rendered one active template and the detail line `Office Desks`; body/document widths remained 1440/1440 and 390/390, with no page errors or failed application requests. The Odoo files in this directory were login-page captures after the local reference authentication throttle, not authenticated list views. No fresh authenticated Odoo comparison or visual parity claim is made for this run; `8073` was not used.

## Orders to Upsell bounded slice (2026-09-12)

The next uncovered Odoo Sales action is `sale.menu_sale_order_upselling` → `sale.action_orders_upselling`, under To Invoice. Odoo uses a read-only `sale.order` list filtered to `invoice_status = upselling`, with search/grouping and the empty-state explanation that delivered quantities exceed ordered quantities under an order-based invoicing policy.

Core3 adds `/order/orders-to-upsell` with a separate `sale-orders-to-upsell` page/API pair joined by `page.id`, the manifest menu entry, Odoo-shaped list fields and mobile List tab, deterministic `order-demo-06` fixture data (`qty_delivered=2`, ordered quantity `1`, `invoice_policy=order`), and a read-only route to the existing Sales order form. The query preserves branch scope and guards the delivered/order-policy rule; the page has explicit populated, empty, and transport-error behavior through the shared datasource contract.

Verification: `bun test test/sales_orders_to_upsell.integration.test.ts` passes (2 tests, 15 assertions); authenticated browser captures were attempted but the persistent `js_repl` required by the playwright-interactive skill was unavailable in this session, so no desktop/mobile visual claim is made. Image artifacts were not added.

## Sales Teams bounded slice (2026-09-12)

The next uncovered Sales-owned source action is Odoo menu `sale.report_sales_team`
→ action `sales_team.crm_team_action_sales`, reached at Sales > Orders > Sales Teams (sequence 30,
visible to `sales_team.group_sale_manager`). Its action is `crm.team` with
`kanban,form` modes and Sales context `in_sales_app=True`; the kanban dashboard
offers Sales Orders, Invoices, and Sales reporting actions, while the form
shows Sales Team, Team Leader, Members, Company, and the Sales addon
`invoiced_target` monthly target field. Core3 reuses the canonical CRM team
form/data contract and adds the Sales-owned `/order/sales-teams` page/API pair,
with visible Kanban/Form tabs, active/archived states, deterministic existing
team fixtures, member counts, monthly invoiced-target display, empty state,
and the `crm.manage` manager boundary. The Sales menu entry is placed after
Customers, matching Odoo's Orders sequence.

Focused coverage: `bun test test/sales_teams_sales_action.integration.test.ts`
passes (2 tests, 12 assertions); UI audit, TypeScript, ESLint, and
`git diff --check` pass. Fallback Chrome captures were attempted at
1440x900 and 390x844 under `/tmp/core3-odoo-parity/sales-teams-20260912/`.
Odoo reached the login page (HTTP 303) and Core3 required authentication (HTTP
401); the required persistent `js_repl` Playwright surface is unavailable, and
the fallback Core3 dev runner hit `EMFILE` before the authenticated route could
be exercised. Therefore no visual parity claim is made; image artifacts remain
outside Git.

## Salespersons report visual audit attempt (2026-09-12)

This bounded audit selected `/order/reporting/salespersons` because it maps to
Odoo `sale.action_order_report_salesperson` and already has a focused Core3
contract test. The Odoo source trace in `addons/sale/report/sale_report_views.xml`
confirms the exact action contract: title `Sales Analysis By Salespersons`,
`graph,pivot` view modes, the bar graph view, `user_id`/Salesperson grouping,
and the default hidden `Order Date: Last 365 Days` facet. The Core3 YAML has the
same visible graph/pivot modes, grouping, title, and date preset. Its extra
`Average Order` field is only declared as a table column and was not treated as
a verifiable rendered mismatch because the graph/pivot surface could not load.

Authenticated desktop (`1440x900`) and mobile (`390x844`) capture was attempted
under `/tmp/core3-odoo-parity/sales-visual2-20260912/`. The available backend at
`127.0.0.1:3001` returned JSON/401 when opened as a browser page, while its
frontend `127.0.0.1:3002` was not listening. After installing the frozen Bun
dependencies, the isolated Vite start still failed before binding with the
exact host error `EMFILE: too many open files` while watching
`sdk/bun/sample/vite.config.ts`. The generated error-document files are not
parity captures and must not be used as evidence. No authenticated Odoo/Core3
visual comparison, correction, or parity claim is recorded; screenshots remain
outside Git. Re-run this audit when a browser-capable Core3 frontend can bind,
then compare labels, graph/pivot toolbar ordering, spacing, and horizontal
overflow at both requested viewports.
