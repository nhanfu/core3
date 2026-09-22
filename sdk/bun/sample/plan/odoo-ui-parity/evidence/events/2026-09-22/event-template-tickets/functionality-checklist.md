# Functionality checklist

- [x] Page/API ownership is joined by `page.id`.
- [x] `events.read` protects the route and datasources.
- [x] `events.write` protects add/edit/delete mutations.
- [x] Stable Exhibition ticket fixtures are idempotent.
- [x] Add rejects blank names, negative maximums, duplicate names, and stale parent rows.
- [x] Edit rejects stale parent/line rows and invalid values.
- [x] Delete rejects stale parent/line rows.
- [x] Empty, missing, and transport-error datasource contracts are declared.
- [x] File-backed migration replay/restart is tested.
- [ ] Authenticated Odoo desktop capture.
- [ ] Authenticated Odoo mobile capture.
- [ ] Authenticated Core3 desktop/mobile comparison.

The unchecked browser items are blocked by the shared-tab borrow timeout and
remain open.
