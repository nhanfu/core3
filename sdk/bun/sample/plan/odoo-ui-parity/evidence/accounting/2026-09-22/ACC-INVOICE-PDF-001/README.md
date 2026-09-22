# ACC-INVOICE-PDF-001 — Invoice PDF artifact download

Date: 2026-09-22
Module: Accounting
Feature: bounded invoice Print/PDF artifact download

## Evidence index

- [source-comparison.md](source-comparison.md)
- [test-results.md](test-results.md)
- [browser-check.md](browser-check.md)
- [verification.md](verification.md)

## Outcome

The existing Accounting Print contract now serves a durable PDF artifact at
`/api/accounting/invoice-pdfs/<invoice-id>`. The page/API contract is matched
by `page.id: invoice-detail`, the route requires `accounting.read`, and the
artifact survives a DuckDB close/reopen.

## Scope boundary

- This slice covers posted customer invoices and customer credit notes only,
  matching Odoo's invoice PDF action boundary.
- It uses the deterministic service-owned PDF artifact; a QWeb renderer and
  external report engine are not introduced.
- No invoice attachment behavior is included in this feature.
- BrowserSkill could not obtain the authenticated Odoo tab because it was
  already owned by another session; no live desktop/mobile claim is made.
