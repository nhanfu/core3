# Functionality checklist

- [x] Page/API remain separate and both use `page.id: purchase-detail`.
- [x] Detail datasource exposes `Ask confirmation` and `Days before receipt`.
- [x] Reminder action requires `purchase.write`, an enabled reminder, an
  allowed order state, the current row version, and a valid signed-in email.
- [x] Preview content includes vendor, order reference, expected date, and
  acknowledgement text.
- [x] Preview history is durable and appears in the existing order chatter
  source without changing order state or version.
- [x] Missing, disabled, stale, invalid-actor, and migration-replay cases are
  covered by the focused integration test.
- [ ] Authenticated Odoo/Core3 desktop and mobile interaction and screenshots;
  blocked by the required existing-tab borrow confirmation.
