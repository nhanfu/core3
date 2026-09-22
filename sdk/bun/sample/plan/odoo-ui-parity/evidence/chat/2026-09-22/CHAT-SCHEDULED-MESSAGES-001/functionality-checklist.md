# Functionality checklist

- [x] Stable action ID `CHAT-SCHEDULED-MESSAGES-001` selected after checking existing Chat routes and tests.
- [x] Odoo menu/action/view/source/security behavior recorded.
- [x] Page/API separation joined by `page.id`.
- [x] Technical permission declared and attached to page, datasource, and mutations.
- [x] Durable migration and deterministic linked fixtures are idempotent.
- [x] List order and message-body search.
- [x] Empty/no-results and detail not-found contracts.
- [x] Edit scheduled date and notification parameters.
- [x] Future-date validation and stale row-version guard.
- [x] Force Send removes the queue row and writes a dispatch audit event.
- [x] Focused integration tests pass.
- [ ] Authenticated Odoo/Core3 desktop comparison.
- [ ] Authenticated Odoo/Core3 mobile comparison.

The final two cases are blocked by the BrowserSkill tab ownership error in
`browser-check.md`.
