# Functionality checklist

- [x] Job-position detail exposes a Trackers stat action.
- [x] Tracker page and API use matching `page.id` and keep SQL out of page YAML.
- [x] Fixture rows are deterministic and migration reruns are idempotent.
- [x] Tracker list is scoped to the selected opening and current company.
- [x] Source search, no-result, empty, and transport-error states are declared.
- [x] Create, edit, and delete persist through the Recruitment datasource.
- [x] Opening/company metadata is assigned from the server-side opening guard.
- [x] Actor, required source, duplicate, missing opening, stale row, and
  invalid length guards reject without partial writes.
- [x] File-backed restart retains a created tracker.
- [ ] Authenticated Odoo desktop capture at 1440x900 — blocked by tab ownership.
- [ ] Authenticated Odoo mobile capture at 390x844 — blocked by tab ownership.
- [ ] Paired visual comparison — not claimed.
