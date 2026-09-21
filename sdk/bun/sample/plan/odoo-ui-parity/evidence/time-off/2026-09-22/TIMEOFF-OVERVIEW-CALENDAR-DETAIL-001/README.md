# TIMEOFF-OVERVIEW-CALENDAR-DETAIL-001

Bounded source-backed feature: Odoo `hr.leave.report.calendar` event popup
mapped to Core3 `/time-off-overview/detail`.

## Core3 paths and result

- Page: `services/time_off/pages/time-off-overview-detail.yaml`
- API/actions: `services/time_off/api/time-off-overview-detail.yaml`
- Overview navigation: `services/time_off/pages/time-off-overview.yaml` and
  `services/time_off/api/time-off-overview.yaml`
- Migration: `services/time_off/migrations/20260922100000-021-overview-calendar-detail.yaml`
- Test: `test/time_off_overview_calendar_detail.integration.test.ts`
- Result: 3 tests / 22 assertions; source mapping, page/API separation,
  migration replay, workflow guards, and file-backed restart passed.

## Odoo source comparison

Compared with
`/home/nhanjs/projects/odoo/addons/hr_holidays/report/hr_leave_report_calendar.xml`.
The source popup has Employee, Time Off Type, Dates with a daterange and
duration, Description, plus manager-gated Approve/Refuse. Core3 declares those
fields and reuses the durable `leave_requests` workflow.

## Authenticated live-reference blocker

Browser instance: `245ea108`; service: `http://localhost:8069`; database:
`core3_reference`. The authenticated desktop launcher contained Discuss,
Calendar, To-do, Contacts, CRM, Sales, Dashboards, Point of Sale, Invoicing,
Project, Timesheets, Events, Surveys, Purchase, Inventory, Maintenance,
Employees, Expenses, and Apps, but no Time Off. Direct
`/odoo/time-off?db=core3_reference` resolved to the Discuss shell on desktop
and mobile; no `hr_holidays` action or popup was available. No Odoo mutation,
credential, cookie, or token was read.

Captures are local-only under `/tmp`:

- Desktop launcher, outer 1440x900 / page viewport 1440x719:
  `/tmp/core3-odoo-parity/timeoff-wave-20260922/odoo-reference-app-launcher-desktop-1440x900.png`
  SHA-256 `99bdb4b02d11b4926e84c6d25aff3bc98b8c5feb758d4a5926179f349aa2f5ce`
- Desktop direct route, outer 1440x900 / page viewport 1440x719:
  `/tmp/core3-odoo-parity/timeoff-wave-20260922/odoo-reference-time-off-route-desktop-1440x900.png`
  SHA-256 `2dfde5796ecd2b40844b42465c2956bf00c2956ecb2f8a8eda7ec0e5e7734d2d`
- Mobile direct route, DOM viewport 390x844 / bsk capture 502x663:
  `/tmp/core3-odoo-parity/timeoff-wave-20260922/odoo-reference-time-off-route-mobile-390x844.png`
  SHA-256 `987828432ad3a65fdaba6eaa6269c1092601075a05ee9037675962052175ec53`

Paired Odoo visual parity is not claimed for this candidate.
