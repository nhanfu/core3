# EMP-EMPLOYEE-RELATED-USER-ACTIVE-001 evidence

## Source and contract

- Odoo defines `hr.employee.is_user_active` as a restricted related field to
  `user_id.active` and renders `(User is Inactive)` when the linked user is
  inactive.
- Core3 uses the durable Employees-owned `employee_related_user_catalog`
  projection because Employees and Auth run in separate service databases.
- Migration `20260922310000-085-employee-related-user-active.yaml` seeds the
  deterministic projection; the API/page contracts join through
  `page.id: employee-detail`.

## Core3 browser evidence

- Authenticated `admin@tms.local` / `admin123` session.
- Desktop: `core3-desktop.png` and `core3-desktop.json` at 1440x1000.
- Mobile: `core3-mobile.png` and `core3-mobile.json` at 390x844.
- Both captures render Settings > User and attendance > Related User and
  `User is Active`; both report zero failed browser requests.

## Odoo comparison blocker

- Desktop capture `odoo-desktop.json` records `admin/admin` rejected with
  `Wrong login/password`.
- Mobile capture `odoo-mobile.json` records the retry blocked by `Too many
  login failures, please wait a bit before trying again.`
- Authenticated Odoo comparison is conditional and no aggregate Employees
  sign-off is claimed.
