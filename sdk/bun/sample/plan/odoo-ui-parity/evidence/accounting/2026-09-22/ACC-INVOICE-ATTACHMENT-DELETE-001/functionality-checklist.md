# Functionality checklist

- [x] Stable ID is unique and follows the attachment upload feature.
- [x] Invoice page and API remain joined by `page.id: invoice-detail`.
- [x] Accounting users with `accounting.write` see the attachment `Remove` action.
- [x] Removal requires an authenticated actor.
- [x] Parent invoice and attachment row versions are guarded atomically.
- [x] Removed attachments leave the active datasource and protected download path.
- [x] Removal increments parent and attachment versions and records chatter.
- [x] Read-only, stale-parent, stale-child, and missing-child attempts preserve data.
- [ ] Odoo live desktop/mobile visual comparison; blocked by shared-tab borrow confirmation.
- [ ] Physical storage deletion and Odoo restricted-audit-trail policy.
