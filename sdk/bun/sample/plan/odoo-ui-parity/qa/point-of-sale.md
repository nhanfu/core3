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
