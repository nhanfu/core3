# Functionality checklist

Feature ID: `POS-ORDER-DETAIL-SEND-EMAIL-001`

- [x] `DETAIL-EMAIL-CONTRACT`: page/API fragments retain matching
  `page.id: pos-order-detail`; detail action requires `pos.write`.
- [x] `DETAIL-EMAIL-VISIBILITY`: detail projects `customer_email` and exposes
  Send Email only when the customer email is present.
- [x] `DETAIL-EMAIL-PREFILL`: recipient, subject, and body are prefilled from
  the service-owned order projection.
- [x] `DETAIL-EMAIL-DURABILITY`: the existing email queue and operation audit
  persist through migration replay and file-backed restart.
- [x] `DETAIL-EMAIL-GUARDS`: missing order, wrong company, stale row, blank
  actor, missing/invalid recipient, and invalid content reject atomically.
- [x] `DETAIL-EMAIL-REGRESSION`: existing list Send Email, order detail,
  delete, pickings, refund-link, and invoice-smart-button suites pass.
- [ ] `DETAIL-EMAIL-VISUAL`: authenticated Odoo/Core3 desktop and mobile
  captures; blocked by BrowserSkill borrow, with no visual claim.
