# Functionality checklist

- [x] Stable feature ID is linked across plan, test, and evidence.
- [x] Page/API separation is preserved for the attendee list.
- [x] Page/API separation is preserved for the attendee detail form.
- [x] `events.write` is required for both mutations.
- [x] Only `Cancelled` registrations can be reopened.
- [x] Missing registrations return `EVENT_ATTENDEE_NOT_FOUND`.
- [x] Stale and replayed writes return 409 without changing state.
- [x] Successful reopen changes `Cancelled` to `Unconfirmed`.
- [x] Successful reopen increments `row_version`.
- [x] File-backed restart preserves the reopened state/version.
- [ ] Authenticated Odoo desktop capture.
- [ ] Authenticated Odoo mobile capture.
- [ ] Authenticated Core3 desktop/mobile visual comparison.
- [ ] Full Events actor matrix and module sign-off.
