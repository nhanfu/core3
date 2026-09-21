# Functionality checklist

- [x] Odoo source action, model method, wizard, form, and access row traced.
- [x] Vehicle list supports selection and exposes `Mail to Driver` to
  `fleet.manage` only.
- [x] Composer validates actor, selection, company scope, driver email,
  template, subject, and message length.
- [x] A multi-selection inserts one durable Sent message per driver.
- [x] Saved templates are durable, active, and duplicate-name guarded.
- [x] Empty selection, missing vehicle, wrong company, missing email, invalid
  template/content, and no-actor failures are explicit and atomic.
- [x] Migration and deterministic fixture replay are covered by the focused
  test's file-backed restart.
- [ ] Attachment upload and Odoo template interpolation remain deferred.
- [ ] Authenticated Odoo desktop/mobile screen comparison is blocked because
  Fleet is not installed/exposed in `core3_reference`.
