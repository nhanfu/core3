# EMP-EMPLOYEE-WORK-PERMIT-ACTIVITY-001 evidence

## Source and contract

- Odoo source: `addons/hr/models/hr_employee.py` defines
  `work_permit_scheduled_activity = fields.Boolean(default=False, groups="hr.group_hr_user")`.
- Core3 keeps `api/employee-detail.yaml` and `pages/employee-detail.yaml`
  separate and joins them through `page.id: employee-detail`.
- Migration `20260922300000-084-employee-work-permit-activity.yaml` adds the
  durable boolean and deterministic demo values.

## Core3 browser evidence

- Authenticated `admin@tms.local` / `admin123` session.
- Desktop: `core3-desktop.png` and `core3-desktop.json` at 1440x1000.
- Mobile: `core3-mobile.png` and `core3-mobile.json` at 390x844.
- Both captures render the Personal > Visa & Work Permit section and
  `Schedule Work Permit Activity`; both report zero failed browser requests.

## Odoo comparison blocker

- Desktop capture `odoo-desktop.json` records the local Odoo `admin/admin`
  attempt remaining on `/web/login` with `Wrong login/password`.
- Mobile capture `odoo-mobile.json` records the retry remaining on
  `/web/login` with `Too many login failures, please wait a bit before trying
  again.`
- Odoo authenticated comparison is therefore conditional and no aggregate
  Employees sign-off is claimed.
