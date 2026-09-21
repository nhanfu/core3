# Functionality checklist

- [x] Separate page/API YAML joined by `page.id`.
- [x] Applicant selection and bulk Send Email action.
- [x] Subject, body, template, and attachment-name composer fields.
- [x] Durable templates and one sent-message row per selected applicant.
- [x] Same-company, actor, selection, missing-applicant, missing-email,
  content, and active-template guards.
- [x] Atomic invalid-input behavior with no partial writes.
- [x] File-backed restart coverage.
- [x] Focused integration coverage.
- [x] Authenticated Core3 desktop composer capture.
- [ ] Authenticated Core3 mobile composer capture.
- [ ] Paired live Odoo desktop/mobile comparison; blocked by reference shell.
