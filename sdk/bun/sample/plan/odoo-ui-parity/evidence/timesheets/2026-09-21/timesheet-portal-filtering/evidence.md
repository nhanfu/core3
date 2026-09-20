# `TIMESHEET-PORTAL-DATE-FILTERS`

Captured 2026-09-21 with authenticated headless Chromium at 1440x900 and
390x844.

## Source comparison

Odoo's authenticated `portal_my_timesheets` controller exposes All,
Last Year, Last Quarter, Last Month, Last Week, Today, This Week, This Month,
This Quarter, and This Year. It renders those controls as `/my/timesheets`
filter links; the desktop capture also shows the source sorting and grouping
menus.

## Odoo evidence

- `odoo-desktop-portal.png` shows the authenticated portal list and full filter
  control family.
- `odoo-desktop-last-month.png` shows the authenticated
  `/my/timesheets?filterby=last_month` state with the changed date window.
- `odoo-mobile-portal.png` and `odoo-mobile-last-month.png` provide the paired
  390px states. The narrow reference table is visibly clipped; this is
  recorded as a reference blocker rather than hidden by document-width metrics.
- `results.json` records authenticated route state, filter URLs, page errors,
  and aborted background requests.

## Core3 status

The Core3 Timesheets agent could not start because global page discovery stopped
at the unrelated Employees schema error:
`PageSchemaError: components[2].title is not allowed`. No Core3 screenshot is
claimed or fabricated. The YAML/API and focused persistence/security contract
remain verified independently; the runtime blocker is outside Timesheets-owned
paths.

Existing Odoo Print/PDF/action blockers remain open and this slice does not
claim module sign-off.
