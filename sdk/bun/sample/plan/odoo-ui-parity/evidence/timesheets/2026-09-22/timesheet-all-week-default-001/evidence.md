# TIMESHEET-ALL-WEEK-DEFAULT-001

## Scope

This evidence covers the bounded internal Timesheets action gap for Odoo's
`timesheet_action_all`, not the portal task report.

## Source comparison

The local Odoo source at
`/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml:484-494`
defines the `timesheet_action_all` action at `/odoo/all-timesheets` with
`search_default_week: 1`. Core3 maps that behavior to
`services/timesheets/pages/all-timesheets.yaml` with
`default_filters: { work_date: this_week }`; the API remains a separate
`page.id: all-timesheets` contract.

## Automated evidence

`test/timesheets_all_week_default.integration.test.ts` passes 4 tests with 17
expectations. It covers the source/action mapping, seven deterministic current
week rows, current-company and empty guards, permission and transport errors,
migration replay, and file-backed restart persistence.

## Browser evidence

BrowserSkill reported a healthy shared browser instance `245ea108`, but the
authenticated Odoo tab could not be borrowed. The tab was already borrowed by
another session, and a later borrow request timed out without confirmation.
No desktop/mobile capture was produced and no visual-parity claim is made.
See `browser-blocker.txt` for the exact blocker details.
