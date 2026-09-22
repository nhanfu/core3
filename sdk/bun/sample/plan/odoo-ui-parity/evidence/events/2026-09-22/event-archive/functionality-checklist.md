# Functionality checklist

- [x] Stable feature ID selected from the uncovered Odoo source inventory.
- [x] Page/API contracts retain matching `page.id` values.
- [x] Existing events receive durable `active=TRUE`; deterministic archived
      fixture is `event-archive-20260115`.
- [x] Active-only default query and explicit Archived filter are declared.
- [x] List Archive/Restore actions require `events.write`.
- [x] Detail Archive/Restore actions require `events.write`.
- [x] Missing-record, stale-row, replay, and row-version increment guards are
      explicit.
- [x] Migration replay and file-backed restart are tested.
- [x] Existing Events regression remains green.
- [ ] Authenticated Odoo desktop/mobile capture: blocked by BrowserSkill tab
      borrow confirmation timeout.
- [ ] Full Events module actor matrix and route-level parity sign-off.
