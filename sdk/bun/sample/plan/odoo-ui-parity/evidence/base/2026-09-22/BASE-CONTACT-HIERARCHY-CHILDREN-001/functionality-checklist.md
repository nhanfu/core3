# Functionality checklist

- [x] Contacts notebook relation is declared on the layout-only contact detail page.
- [x] API datasource is joined through `page.id: contact-detail` and has read permission/error state.
- [x] Deterministic child contact is seeded idempotently under `company-demo`.
- [x] Related contacts support read, search, empty, transport-error, and company-scope states.
- [x] Create validates name, duplicate identity/email, active parent, company, and parent row version.
- [x] Edit validates child ownership, required name, email uniqueness, child row version, and parent row version.
- [x] Delete validates child ownership, child row version, and parent row version.
- [x] Child writes and parent version updates are durable and atomic across file-backed restart.
- [ ] Authenticated Odoo desktop/mobile capture.
- [ ] Authenticated Core3 desktop/mobile capture and visual comparison.
