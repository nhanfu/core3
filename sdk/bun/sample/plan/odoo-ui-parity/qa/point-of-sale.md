# Point of Sale QA ledger

## 2026-09-22 — POS-SESSION-PICKINGS-001

- Status: bounded implementation and service verification complete; visual
  sign-off is blocked because the required BrowserSkill tab was owned by
  another active session.
- Source: Odoo 19 `pos_session_view.xml` Pickings stat button and
  `pos_session.py` `action_stock_picking()` ready-picking domain.
- Implementation: session-detail Pickings stat action, separate
  `/point-of-sale/session-pickings` page/API pair, current-company/session
  scoped Ready projection over durable POS picking rows, responsive list/card
  states, transfer-detail row navigation, and explicit empty/error metadata.
- Focused test: `bun test ./test/pos_session_pickings.integration.test.ts
  --timeout 30000` — 3 tests, 18 assertions passed.
- Regression: session Orders, session Payments, order Pickings, and
  actor/company boundary suites passed 20 tests and 166 assertions; UI audit
  passed with 842 pages, 850 routes, and 1,755 datasources; frontend build,
  POS CSS build, and `git diff --check` passed.
- BrowserSkill: instance `245ea108` was connected; Odoo tab `1770662590` was
  listed as `Acme Corporation`, but `bsk tab borrow` returned `tab is borrowed
  by another session` with owner `ssyn`. Worker session `ppeq` was stopped.
  No independent browser/login was used, and no desktop/mobile capture or
  visual-parity claim is made.
- Evidence: `../evidence/point_of_sale/2026-09-22/POS-SESSION-PICKINGS-001/`.

## 2026-09-22 — POS-SESSION-ORDERS-001

- Status: bounded implementation and service verification complete; visual
  sign-off is blocked by the required BrowserSkill tab borrow.
- Source: Odoo 19 `pos_session_view.xml` Orders stat button and
  `pos_session.py` `action_view_order()` domain (`session_id in self.ids`).
- Implementation: session-detail Orders stat action, separate
  `/point-of-sale/session-orders` page/API pair, current-company/session scoped
  read projection, search/status filters, row navigation, and explicit
  empty/unauthorized/forbidden/not-found/transport metadata. No schema change
  was needed; the projection uses durable POS orders and existing migrations.
- Focused test: `bun test ./test/pos_session_orders.integration.test.ts
  --timeout 30000` — 4 tests, 23 assertions passed.
- Regression: session payments, order pickings, order delete, and refund-link
  suites passed 11 tests and 71 assertions; UI audit passed with 837 pages,
  845 routes, and 1,747 datasources; frontend build, POS CSS build, and
  `git diff --check` passed.
- BrowserSkill: instance `245ea108` was connected and the existing Odoo user
  tab was listed, but the required borrow timed out waiting for confirmation;
  the tab remained user-scoped. No independent login or alternate browser was
  used. No desktop/mobile capture or visual-parity claim is made.
- Evidence: `../evidence/point_of_sale/2026-09-22/POS-SESSION-ORDERS-001/`.

## 2026-09-22 — POS-SESSION-PAYMENTS-001

- Status: bounded implementation and service verification complete; visual
  sign-off is blocked by the required BrowserSkill tab borrow.
- Source: Odoo 19 `pos_session_view.xml` Payments smart button and
  `pos_session.py` `action_show_payments_list()` domain/context.
- Implementation: session-detail Payments action, separate session-scoped
  page/API list, company and captured-order-state guards, method grouping,
  existing payment-detail row navigation, and explicit empty/error metadata.
- Focused test: `bun test ./test/pos_session_payments.integration.test.ts
  --timeout 30000` — 3 tests, 18 assertions passed.
- Regression: the POS core/session subset passed 16 tests and 84 assertions;
  audit passed with 826 pages, 834 routes, and 1,718 datasources before the
  latest concurrent inventory files appeared. A broader rerun is currently
  blocked by duplicate datasource id `inventory_reordering_rule_products` in
  the unrelated concurrent inventory reordering-rule API/page pair.
  Frontend/CSS build and `git diff --check` passed before that blocker.
- BrowserSkill: instance `245ea108` was connected. Odoo tab `1770662590` was
  already borrowed by session `olvm`; the fresh borrow in session `xrhq`
  timed out waiting for human confirmation. No independent browser/login was
  used. No desktop/mobile capture or visual-parity claim is made.
- Evidence:
  `../evidence/point_of_sale/2026-09-22/POS-SESSION-PAYMENTS-001/browser-evidence.md`

## 2026-09-22 — POS-ORDER-DELETE-001

- Status: bounded feature verified; POS-only commit candidate.
- Source: Odoo 19 `pos_order_view.xml` Actions > Delete and
  `pos_order.py` draft/cancel deletion guard.
- Implementation: `pos-order-detail` page/API Delete action, `pos.write`
  permission, company/state/row-version guards, dependent-row cleanup,
  migration fixture, and restart persistence test.
- Focused test: `bun test test/pos_order_delete.integration.test.ts` — 2
  tests, 14 assertions passed.
- Browser: authenticated Core3 desktop and mobile captures passed against the
  isolated direct backend; authenticated Odoo desktop order detail was
  inspected with Delete and Cancel Order visible. Evidence is linked below.
- Blockers: full mixed-module startup reports duplicate
  `time_off.requests.refuse`; the Vite proxy showed an initial `/api/modules`
  502. These are outside POS scope and are not treated as POS failures.
- Evidence:
  `../evidence/point_of_sale/2026-09-22/POS-ORDER-DELETE-001/browser-evidence.md`

## 2026-09-22 — POS-ORDER-REFUND-LINKS-001

- Status: bounded implementation and service verification complete; visual
  sign-off is blocked by the missing reusable Core3 QA browser session.
- Source: Odoo 19 `action_view_refund_orders()` and
  `action_view_refunded_order()` plus the `Refunds`/`Refunded Orders` smart
  buttons in `pos_order_view.xml`.
- Implementation: read-only smart-button actions on `pos-order-detail`, a
  separate page/API-owned filtered refund list, current-company/source-order
  guards, and migration `0.0.51` linked fixture.
- Focused test: `bun test ./test/pos_order_refund_links.integration.test.ts
  --timeout 30000` — 3 tests, 24 assertions passed.
- Runtime: POS-only `/api/modules` returned 200 and discovered the new route;
  `/api/auth/me` returned 401 because browser instance `245ea108` had no
  reusable local QA Core3 login tab/session.
- Odoo: authenticated positive source/detail/list captures exist under `/tmp`;
  temporary reference data was deleted after inspection.
- Evidence:
  `../evidence/point_of_sale/2026-09-22/POS-ORDER-REFUND-LINKS-001/verification.md`

## 2026-09-22 — POS-ORDER-REFUND-LINKS-001

- Selected bounded feature: Odoo Refunds and Refunded Orders smart-button
  relationship navigation, distinct from Return Products creation, bulk
  invoicing, deletion, and Pickings.
- Source/reference analysis and pre-code acceptance checklist are under
  `../evidence/point_of_sale/2026-09-22/POS-ORDER-REFUND-LINKS-001/`.
- Implementation and browser verification are pending in this run.

## 2026-09-22 — POS-ORDER-INVOICE-SMART-BUTTON-001

- Status: bounded implementation and service verification complete; Core3
  authenticated visual verification is blocked by the missing reusable QA
  session.
- Source: Odoo 19 `action_view_invoice()` in `pos_order.py`, the `Invoice`
  smart button in `pos_order_view.xml`, and the live Orders form at
  `http://localhost:8069`.
- Implementation: read-only `Invoice` smart-button navigation on
  `pos-order-detail`, separate `pos-invoice-detail` page/API contracts,
  current-company linked-invoice projection, and migration `0.0.52` fixture.
- Focused test: `bun test ./test/pos_order_invoice_smart_button.integration.test.ts
  --timeout 30000` — 3 tests, 18 assertions passed.
- Regression tests: bulk invoice (3), delete (2), pickings (3), and refund
  links (3) suites all passed; audit reports 807 pages, 816 routes, and 1,671
  datasources; POS CSS build, targeted ESLint, and `git diff --check` passed.
- Browser: authenticated Odoo reference inspection passed for the live Orders
  list/order form. Its four demo orders are all un-invoiced, so the positive
  smart-button state is an exact reference-data blocker. Core3 `/api/modules`
  returned 200 and discovered the route, but the protected page/API returned
  401 without a reusable local QA login session.
- Evidence:
  `../evidence/point_of_sale/2026-09-22/POS-ORDER-INVOICE-SMART-BUTTON-001/`.

## 2026-09-22 — POS-ORDER-DETAIL-SEND-EMAIL-001

- Status: bounded implementation and service verification complete; authenticated
  Odoo/Core3 desktop/mobile evidence is blocked by the required BrowserSkill
  tab borrow not completing, so no visual-parity claim is made.
- Source: Odoo 19 `pos_order_view.xml` order-form `action_send_mail` envelope
  action, hidden when the order has no customer email.
- Implementation: added the `Send Email` action to `pos-order-detail`, projected
  `customer_email` through the page/API pair, and reused the durable POS email
  queue with `pos.write`, company, actor, recipient, content, stale-row, and
  restart guards.
- Focused test: `bun test ./test/pos_order_detail_email.integration.test.ts
  --timeout 30000` — 4 tests, 25 assertions passed.
- Regression: related POS order/email/detail suites passed 31 tests and 185
  assertions; audit, frontend build, POS CSS build, targeted ESLint, and
  `git diff --check` passed.
- BrowserSkill: instance `245ea108` was connected and the Odoo user tab was
  listed, but borrowing tab `1770662590` in session `wqul` waited for browser
  confirmation and did not acquire the tab; it remained user-scoped. No
  independent browser or login was used, and no Odoo/Core3 screenshots were
  created or claimed.
- Evidence:
  `../evidence/point_of_sale/2026-09-22/POS-ORDER-DETAIL-SEND-EMAIL-001/`.
