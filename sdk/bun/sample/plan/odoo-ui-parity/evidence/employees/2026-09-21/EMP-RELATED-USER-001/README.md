# EMP-RELATED-USER-001 evidence

This bounded slice covers selecting or clearing an existing enabled Related User
for an active employee. Odoo desktop/mobile captures show the authenticated
employee Settings > User control; Core3 desktop/mobile captures show the
authenticated employee detail shell and the deterministic fixture-company
empty state.

Artifacts:

- `odoo-desktop.png`, `odoo-mobile.png`: authenticated Odoo employee 1 at
  `/odoo/employees/1`, Settings tab selected.
- `core3-desktop.png`, `core3-mobile.png`: authenticated Core3 employee detail
  attempt at `/employees/detail?id=employee-demo-001`.
- `source-comparison.md`: source-to-contract mapping and boundary notes.
- `verification.md`: focused tests, runtime checks, and blockers.
- `browser.json`, `desktop.json`, `mobile.json`, `core3-desktop.json`,
  `core3-mobile.json`: machine-readable viewport observations.

No aggregate Employees sign-off is claimed. Core3's fixture company is
`Core3 Vietnam`, while the authenticated session defaults to `Core3 Demo
Company`, so the current-company guard intentionally returns an empty detail.
The Employees service also has no live cross-service auth-user catalog; the
migration owns a deterministic projection for the seeded IDs and records that
limitation below.
