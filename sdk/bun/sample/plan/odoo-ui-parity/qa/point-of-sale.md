# Point of Sale QA ledger

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
