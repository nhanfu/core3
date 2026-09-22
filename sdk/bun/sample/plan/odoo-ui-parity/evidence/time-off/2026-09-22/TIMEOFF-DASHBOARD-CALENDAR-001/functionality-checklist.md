# Functionality checklist

- [x] Stable ID and Odoo source action recorded.
- [x] Page and API fragments are separate and joined by `page.id`.
- [x] Personal employee and fixed-year query scope is durable and deterministic.
- [x] Year calendar uses shared `ListView`/calendar primitives.
- [x] Calendar rows open the existing request detail by durable request ID.
- [x] Empty, 503 transport, and missing-year results are explicit.
- [x] Migration replay and file-backed close/reopen behavior are covered.
- [x] Read permission is declared on the page, datasource, and actions.
- [ ] Authenticated Odoo desktop capture.
- [ ] Authenticated Odoo mobile capture.
- [ ] Paired visual comparison; blocked by tab ownership/borrow confirmation.
