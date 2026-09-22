# POS-CUSTOMER-ORDERS-001 verification

- Focused contract coverage: `test/pos_customer_orders.integration.test.ts`.
- BrowserSkill: explicit borrow of Odoo tab `1770662590` was attempted once
  from session `czqe` and rejected because the tab was already borrowed by
  session `vyhe`. The session was stopped immediately; no tab was navigated,
  no credentials were accessed, and no independent browser was used.
- No authenticated Core3/Odoo desktop or mobile capture was produced; no
  visual-parity claim is made.
- Remaining gaps: partner commercial-entity semantics, a live actor/company
  browser matrix, and authenticated desktop/mobile comparison.
