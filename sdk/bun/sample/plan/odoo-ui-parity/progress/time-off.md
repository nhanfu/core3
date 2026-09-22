# Time Off parity progress

Module owner: time-off module owner
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `75667fe0`

## 2026-09-22 bounded candidate: Time Off Summary QWeb-PDF report

Implemented stable ID `TIMEOFF-SUMMARY-REPORT-001` for Odoo's installed
`action_report_holidayssummary`. The existing employee Summary wizard now uses
the declarative `print_report` operation and records durable Odoo report
metadata, PDF output, the 60-day period, matching leave measures, filename,
actor, and deterministic run history. Migration `0.0.26` is replay-safe; page
and API remain separate and joined by `page.id`.

Focused verification passes 4 tests / 19 assertions; the full Time Off glob
passes 78 tests / 737 assertions. BrowserSkill instance `245ea108` was
healthy, but the authenticated Odoo tab was already borrowed by another
session; task-created Odoo navigation resolved to Discuss and the task-created
Core3 route returned 401 without an auth session. Desktop/mobile blocker
captures are documented in the evidence directory and no visual-parity claim
is made. Time Off remains conditional and unsigned-off.

## Bounded draft deletion slice

## QA-pending candidate `047cbd03` (2026-09-13)

Allocation-balance persistence candidate is queued in existing
`agent/time-off-draft-delete-20260913`; no merge was performed. Focused evidence
is **2/19**, audit **647/662/1,112**. Build/lint/diff-check confirmation,
browser actor/restart, paired Odoo, typecheck, Temporal, and broader workflow
gates remain open.

Only unchanged Draft requests can be deleted from the list/detail contracts;
missing, non-Draft, stale, and repeated deletes return deterministic guards.
The candidate verifies explicit actor-role declarations and file-backed
close/reopen migration persistence. Focused regression, audit, frontend build,
and diff-check pass. No full-module parity claim is made.

## Open gates

Live Core3 HTTP binding failed; Playwright/js_repl and authenticated candidate
browser evidence are unavailable; paired Odoo desktop/mobile comparison,
repository typecheck, and local lint remain open or blocked. Full actor,
workflow/CRUD, and adapter coverage remain open.

## Reviewer reconciliation `047cbd03` (2026-09-13)

Integrated allocation-balance persistence as `c4250943`, preserving the active
progress ledger during conflict resolution. Post-merge Time Off verification
passed **53/550**, audit **661/670/1,158**, frontend build, and diff-check;
QA reports balance idempotency, row-version/workflow recalculation,
CRUD/permissions, authenticated desktop/mobile, reload, and file-backed reopen
evidence. Temporal is not applicable to the synchronous local workflow. Fresh
authenticated paired Odoo comparison remains open; no full sign-off.

## 2026-09-22 bounded candidate: accrual-plan employee stat

Implemented the source-backed Odoo `action_open_accrual_plan_employees` stat
action. The manager-only `/accrual-plans/detail/employees` read surface is
joined to its API by `page.id`, backed by migration `0.0.22` allocation-plan
relations and an idempotent lookup index. Focused verification passes **2
tests / 18 assertions**, including deterministic grouping, permission contract,
empty/503 states, migration replay, and file-backed restart persistence.

The live `core3_reference` database has no installed Time Off app/menu and
direct Odoo Time Off navigation resolves to Discuss. Core3 browser startup is
blocked by the unrelated dirty `services/fleet/api/vehicles.yaml` parse error;
paired visual evidence is not claimed. Time Off remains conditional and
unsigned-off.

## 2026-09-22 bounded candidate: My Allocations Activity view

Implemented the source-backed `hr_leave_allocation_action_my` Activity mode.
`/my-allocations` now exposes List, Cards, and desktop-only Activity tabs with
the seven Odoo activity types. API and page remain joined by
`page.id: my-allocations`; migration `0.0.23` persists seeded activity slots,
new-allocation slots, scheduling state, and row versions. The scheduling action
requires `time_off.write` and rejects invalid types/dates, missing or cancelled
allocations, and stale rows.

Focused verification passes **3/19**; full Time Off regression passes **66/669**;
frontend/CSS builds and diff-check pass. Evidence is under
`evidence/time-off/2026-09-22/TIMEOFF-MY-ALLOCATIONS-ACTIVITY-001/`.

The authenticated `core3_reference` browser has no Time Off menu and resolves
the requested route to Discuss. Core3 module runtime also exits before binding
on the existing duplicate `time_off.requests.refuse` named-action declaration.
No Odoo/Core3 visual parity claim is made; Time Off remains conditional and
unsigned-off.

## 2026-09-22 bounded candidate: second approval workflow

Implemented Odoo's two-level `hr.leave` approval contract. The existing request,
approval, and overview seams now expose `Submitted`, `Second Approval`, and
`Approved`, with separate manager-only first Approve and final Validate actions.
Migration `0.0.24` adds idempotent validation-type and first/second approver
audit tables; final validation applies balance once and all transitions require
row-version guards.

Focused verification passes **3/20**; full Time Off regression passes
**69/689**. Evidence is under
`evidence/time-off/2026-09-22/TIMEOFF-SECOND-APPROVAL-001/`. The authenticated
`core3_reference` browser has no Time Off app/action surface, so paired Odoo
desktop/mobile visual evidence is blocked and no parity claim is made.

## 2026-09-22 bounded candidate: Time Off Analysis report action

Implemented the source-backed Odoo `hr_leave_report_action` contract at
`/time-off-analysis`. The former status-count approximation is now a durable
allocation/request report with Odoo-signed day/hour measures, employee/type/
month Graph/Pivot grouping, department/company context, filters, empty/503
states, and a read-only `time_off.read` boundary. Migration `0.0.25` adds
metadata and idempotent report indexes while preserving the stable route and
page/API join.

Focused verification passes **3 tests / 17 assertions** in
`test/time_off_analysis.integration.test.ts`. Evidence is under
`evidence/time-off/2026-09-22/TIMEOFF-ANALYSIS-001/`. BrowserSkill Odoo
desktop/mobile verification is blocked because the authenticated route resolves
to Discuss; Core3 binds in the isolated runtime but the task-created tab has no
Core3 auth session (401), so no independent login or credential-bearing capture
was attempted. No paired visual parity claim is made; Time Off remains
conditional and unsigned-off.

## 2026-09-22 bounded candidate: By Employee report row drilldown

Implemented `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001`, the missing Odoo form-mode
row action from `action_hr_available_holidays_report`. By Employee rows now
open the existing Leave Request detail route with the durable request ID for
both click and double-click, under `time_off.read`; page/API separation remains
joined by `page.id` and no migration was needed.

Focused verification passes **2 tests / 12 assertions** and the Time Off
regression glob passes **74 tests / 718 assertions**. Time Off CSS, the full
frontend build, and `git diff --check` pass. Evidence is under
`evidence/time-off/2026-09-22/TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001/`.

BrowserSkill instance `245ea108` was healthy, but the normal authenticated
Odoo tab was already borrowed by another session; the pending PDF-tab borrow
was cancelled. No Odoo desktop/mobile visual-parity claim is made.

## 2026-09-22 bounded candidate: personal dashboard calendar action

Implemented `TIMEOFF-DASHBOARD-CALENDAR-001`, the missing Odoo
`action_my_days_off_dashboard_calendar` year-calendar action. Core3 adds the
page/API-separated `/time-off/dashboard-calendar` route, a `My Calendar`
dashboard entry, personal employee/year filtering, request drilldown, empty
and 503 states, and durable reuse of `leave_requests` without a new migration.

Focused verification passes **2 tests / 20 assertions**; the full Time Off
regression passes **80 tests / 760 assertions**. BrowserSkill instance
`245ea108` was healthy, but tab `1770662590` was already owned by another
session and the required borrow confirmation did not complete within 120s.
No Odoo navigation or mutation occurred, no desktop/mobile captures exist,
and no visual-parity claim is made. Evidence is under
`evidence/time-off/2026-09-22/TIMEOFF-DASHBOARD-CALENDAR-001/`.
