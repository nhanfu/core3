# Acceptance checklist

- [x] Contacts page/API fragments remain joined by `page.id: contacts`.
- [x] Merge is visible only as a selectable Contacts bulk action and requires
      `base.contacts.manage`.
- [x] Two or three selected active contacts are required.
- [x] Selected contacts must be in one current company and share an email.
- [x] Destination must be selected, active, selected, and at its expected row
      version.
- [x] Parent/child selections are rejected before mutation.
- [x] Categories, activities, messages, attachments, followers, bank-account
      relations, and unselected child references are reparented atomically.
- [x] Source contacts are deleted only after relation updates succeed.
- [x] A durable merge audit row records destination, source IDs, and actor.
- [x] Migration replay is idempotent and file-backed restart retains the merge
      audit and deleted source state.
- [ ] Authenticated Odoo/Core3 desktop comparison at 1440x900.
- [ ] Authenticated Odoo/Core3 mobile comparison at 390x844.

The final two visual checks are blocked by BrowserSkill tab ownership; they are
not marked pass.
