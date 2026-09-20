# `TIMESHEET-CALENDAR-MULTI-CREATE` evidence

Date: 2026-09-20

## Authenticated browser runs

- Core3: `http://127.0.0.1:3040/timesheets`, authenticated as the seeded
  administrator through local Core3 auth (`admin@tms.local`). The modal was
  opened at desktop 1440x900 and mobile 390x844, submitted for 2026-01-22
  through 2026-01-24 at 4 hours/day, and the resulting three Draft entries
  were visible after refresh.
- Odoo: `http://127.0.0.1:8069/odoo/timesheets`, authenticated against the
  local `core3_reference` reference as `codex@core3.local`. Desktop 1440x900
  was captured with `view_type=calendar`; responsive mobile 390x844 resolved
  to Odoo's kanban state.

## Artifacts

- `core3-desktop.png`
- `core3-mobile.png`
- `odoo-calendar-desktop.png`
- `odoo-calendar-mobile.png`
- `odoo-8069-desktop.png` and `odoo-8069-mobile.png` (loaded-state route
  captures confirming the authenticated action before the calendar run)

All six browser runs reported zero `pageerror` and `requestfailed` events.
`document.body.scrollWidth` and `document.documentElement.scrollWidth` matched
the viewport in every run. The mobile Odoo calendar-to-kanban behavior is
recorded as observed responsive behavior; it is not claimed as a mobile
calendar parity match. Passwords and tokens are not stored in this artifact.
