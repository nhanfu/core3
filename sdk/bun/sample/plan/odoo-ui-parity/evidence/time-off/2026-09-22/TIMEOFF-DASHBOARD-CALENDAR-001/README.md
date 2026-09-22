# TIMEOFF-DASHBOARD-CALENDAR-001

Bounded feature: personal dashboard calendar action.

## Source and implementation

- Odoo action: `action_my_days_off_dashboard_calendar`
- Odoo source: `/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_leave_report_calendar.xml`
- Core3 page: `services/time_off/pages/time-off-dashboard-calendar.yaml`
- Core3 API: `services/time_off/api/time-off-dashboard-calendar.yaml`
- Entry action: `services/time_off/api/time-off-dashboard.yaml` and the
  `My Calendar` toolbar entry in `services/time_off/pages/time-off-dashboard.yaml`
- Stable ID: `TIMEOFF-DASHBOARD-CALENDAR-001`

The Core3 route `/time-off/dashboard-calendar` is a documented route alias for
Odoo's modal year-calendar action. It reuses durable `leave_requests` records,
restricts reads to the current employee fixture and selected year, and opens
the existing request detail route.

## Verification

- Focused: `bun test ./test/time_off_dashboard_calendar.integration.test.ts --timeout 30000`
- Result: 2 tests, 20 assertions, 0 failures
- Time Off regression: `bun test ./test/time_off*.integration.test.ts --timeout 30000`
- Result: 80 tests, 760 assertions, 0 failures

Covered: source action/view mapping, page/API `page.id` join, read permission,
personal employee filtering, year filtering, request drilldown, empty state,
503 transport state, migration replay, and file-backed close/reopen durability.

## BrowserSkill Odoo gate

BrowserSkill instance: `245ea108`.

The required session was `oibd`. User tabs showed the ordinary authenticated
Odoo tab `1770662590` (`Acme Corporation`,
`http://localhost:8069/odoo/contacts/9`) in the user scope. It was already
owned by another agent session. The required command
`bsk tab borrow 1770662590 --session oibd --timeout 120s` did not receive a
borrow grant before the confirmation window ended; the tab remained in the
user scope. The task-created agent tab remained `about:blank`.

No Odoo navigation, mutation, screenshot, or desktop/mobile capture was
possible. There are no capture files for this feature. The session was stopped
with `bsk session stop oibd`; no borrowed tab was left outstanding.

Status: conditional bounded implementation only. No Odoo visual-parity claim
or whole-module completion claim is made.
