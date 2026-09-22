# Functionality checklist

- [x] Existing `purchase-detail` page/API `page.id` remains matched.
- [x] Send message action is Purchase-write protected.
- [x] Log note action is Purchase-write protected.
- [x] Actor, missing-order, blank-content, and stale-version guards are declared.
- [x] Public messages and internal notes have distinct stable action labels.
- [x] Chatter timeline includes existing email/reminder history and new entries.
- [x] Deterministic seed rows are idempotent.
- [x] File-backed restart and migration replay are covered.
- [ ] Odoo/Core3 desktop and mobile screenshots: blocked by shared-tab ownership.
