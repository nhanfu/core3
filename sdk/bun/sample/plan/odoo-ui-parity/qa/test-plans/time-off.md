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

## Exit criteria

Full sign-off requires complete CRUD and actor matrices, restart persistence,
all workflow variants, paired Odoo desktop/mobile comparisons, and Temporal
coverage for durable integrations. Current evidence is conditional.
