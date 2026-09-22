# Time Off detailed QA test plan

Module: time-off  
QA owner: time-off-qa  
Developer owner: time-off module owner  
Reference addon/version: hr_holidays, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`time-off.md`](../../time-off.md); executed evidence is
recorded in [`../time-off.md`](../time-off.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Requests/allocations | request, allocation, approval and summary routes | Leave CRUD, submit/approve/refuse/cancel, balances and activities |
| Configuration | leave types, accrual, milestones, mandatory days and holidays | Type/rule CRUD, accrual rules, calendars and manager settings |
| Reporting | summary/by-type/balance routes | Grouped reports, employee/type filters and read-only states |

Actors are Time Off Manager, employee, department approver, Fleet ordinary user,
wrong-company user and unauthenticated user. Fixtures use stable employees,
leave types, allocations, requests, accrual plans, holidays and departments;
mutations use isolated databases and deterministic dates.

## Functional, workflow, security, and visual gates

| Case ID | Expected result | Status |
| --- | --- | --- |
| TIMEOFF-FUNC-001 | Request/allocation CRUD, balances, reports, activities and validation use persisted data | pass: focused suite |
| TIMEOFF-WF-001 | Draft → Submitted → Approved/Refused and approved → Cancelled update versions and reasons atomically | pass: authenticated probes |
| TIMEOFF-WF-002 | Accrual, allocation, mandatory-day and holiday rules enforce date/type/employee scope | pass at contract level |
| TIMEOFF-PERM-001 | Manager/approver actions succeed; Fleet user receives 403 for manager approval; wrong-company and unauthenticated data remain isolated | partial: one boundary verified |
| TIMEOFF-DATA-001 | Reapply schema/demo data idempotently; reload/restart preserves state and balances | reload pass; restart planned |
| TIMEOFF-UI-001 | All 16 routes render at 1440x900 and 390x844 without errors or overflow and match paired Odoo states | route 32/32 pass; paired comparison pending |
| TIMEOFF-UI-002 | Forms, calendars, approval dialogs, reports and empty/denied states match Odoo | planned paired interaction capture; supporting-document Core3 desktop/mobile capture passed, Odoo pair blocked by unavailable hr_holidays menu |
| TIMEOFF-ATTACH-001 | Submitted request supporting documents list, upload/download/remove contracts, size/duplicate/state/stale guards, and restart persistence | pass: `time_off_request_attachments.integration.test.ts`; Core3 browser seeded-document capture; Odoo runtime blocked |
| TIMEOFF-INT-001 | Payroll, calendar, notification and cross-module durable flows use Temporal with retry/replay/restart/compensation coverage | planned |
| TIMEOFF-ACCRUAL-EMP-001 | Accrual Plan Employees stat filters durable allocation employees, enforces manager read scope, and preserves search/empty/transport/restart behavior | pass: `time_off_accrual_plan_employees.integration.test.ts`; Odoo/Core3 browser blocked as recorded in evidence |
| TIMEOFF-ACTIVITY-MYALLOC-001 | My Allocations exposes the Odoo Activity view, durable slots, scheduling guards, and restart persistence | pass: `time_off_my_allocations_activity.integration.test.ts`; Odoo/Core3 browser blocked as recorded in evidence |
| TIMEOFF-ANALYSIS-001 | Time Off Analysis exposes the Odoo report union, signed measures, Graph/Pivot grouping, filters, empty/error states, read permission, and migration replay | pass: `time_off_analysis.integration.test.ts`; paired Odoo/Core3 browser blocked as recorded in evidence |
| TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001 | By Employee report rows open the existing Leave Request form through the durable request ID, with read permission and existing not-found/error guards | pass: `time_off_report_employee_drilldown.integration.test.ts`; Odoo tab borrow blocked before navigation |
| TIMEOFF-DASHBOARD-CALENDAR-001 | Dashboard `My Calendar` maps Odoo `action_my_days_off_dashboard_calendar` to a personal year calendar, filters the durable employee/year scope, opens request detail, and preserves empty/503/restart behavior | pass: `time_off_dashboard_calendar.integration.test.ts` (2 tests / 20 assertions); Odoo borrow confirmation timed out before navigation, so no visual claim |
| TIMEOFF-DASHBOARD-REQUEST-MODAL-001 | Dashboard `New` maps Odoo `hr_leave_action_my_request` to a page/API-joined Time Off Request modal with durable Draft creation, active-type lookup, deterministic dates, overlap/duplicate guards, and write permission | pass: `time_off_dashboard_request_modal.integration.test.ts` (3 tests / 21 assertions); authenticated Odoo tab reached Discuss without Time Off, so desktop/mobile visual proof is blocked |

## Exit criteria

Full sign-off requires complete CRUD and actor matrices, restart persistence,
all workflow variants, paired Odoo desktop/mobile comparisons, and Temporal
coverage for durable integrations. Current evidence is conditional.
