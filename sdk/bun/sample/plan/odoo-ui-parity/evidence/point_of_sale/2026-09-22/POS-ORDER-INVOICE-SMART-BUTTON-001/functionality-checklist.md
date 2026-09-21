# Functionality checklist

Feature ID: `POS-ORDER-INVOICE-SMART-BUTTON-001`

- [x] `INVOICE-SMART-CONTRACT`: page/API fragments use matching `page.id`
  values and the existing order page exposes a read-only Invoice action.
- [x] `INVOICE-SMART-LINK`: the action passes the persisted `invoice_id` to a
  separate invoice detail route.
- [x] `INVOICE-SMART-READ`: the detail projects invoice number, status, order,
  customer, date, total, and source record from service-owned tables.
- [x] `INVOICE-SMART-SCOPE`: read access requires `pos.read`; the datasource
  joins through the linked order's current company and does not leak a
  cross-company or missing record.
- [x] `INVOICE-SMART-DURABILITY`: the linked order and invoice survive
  idempotent migration replay and file-backed close/reopen.
- [x] `INVOICE-SMART-REGRESSION`: bulk invoice, Delete, Pickings, Refunds,
  Return Products, and existing order-detail contracts remain passing.
- [ ] `INVOICE-SMART-VISUAL`: authenticated Core3 desktop/mobile captures and
  positive linked-invoice click-through are blocked by the missing reusable
  local Core3 QA login session; no visual parity claim is made.
- [ ] `INVOICE-SMART-ODOO-POSITIVE`: the live reference contains no invoiced
  POS order, so the positive Odoo smart-button state is unavailable without
  mutating reference data.
