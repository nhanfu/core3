# Functionality checklist

- [x] Stable action ID `CHAT-MAIL-MESSAGES-001` selected after checking existing Chat routes and the completed Scheduled Messages slice.
- [x] Local Odoo menu/action/view/security behavior recorded.
- [x] Page/API separation joined by `page.id`.
- [x] Technical permission declared and attached to page, datasource, and navigation.
- [x] Idempotent message metadata migration over persisted Chat rows.
- [x] List ordering, body/subject/author/thread search, and empty state.
- [x] Read-only detail form and missing-record contract.
- [ ] Authenticated Odoo/Core3 desktop comparison.
- [ ] Authenticated Odoo/Core3 mobile comparison.
- [ ] Gateway, recipients, notification, tracking, and message mutation parity.

The browser comparison and remaining Odoo fields are documented as gaps rather than treated as complete.
