# Maintenance detailed QA test plan

Module: maintenance  
QA owner: maintenance-qa  
Developer owner: maintenance module owner  
Reference addon/version: maintenance, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This checklist follows the source inventory in [`maintenance.md`](../../maintenance.md).
The execution ledger is [`../maintenance.md`](../maintenance.md).

## Coverage inventory

| Odoo menu/action | Core3 route/API | Views and fixture scope |
| --- | --- | --- |
| Dashboard / Maintenance Teams | `/maintenance`; dashboard/team APIs | Team cards, To Do, preventive, corrective, unscheduled and counts |
| Maintenance Requests | `/maintenance/maintenance-requests`; request APIs | Kanban, List, Pivot, Graph, Calendar, Activity, filters and detail |
| Maintenance Calendar | `/maintenance/maintenance-calendar` | Calendar/list/kanban and team/date facets |
| Equipment | `/maintenance/equipments`; equipment APIs | Kanban, List, Form, stat action and active/archived fixtures |
| Request Reporting | `/maintenance/maintenance-requests-analysis` | Graph/Pivot/List/Calendar/Activity and empty/error states |
| Maintenance Teams | `/maintenance/maintenance-teams`; team APIs | List/Kanban/Form, dashboard links, CRUD and linked-delete guard |
| Equipment Categories | `/maintenance/equipement-categories`; category APIs | List/Kanban/Form, equipment/request stat actions and linked-delete guard |
| Configuration | `/maintenance/maintenance-settings` | Full-width settings form and manager-only update |
| Restricted source actions | `/maintenance/maintenance-stages`, `/maintenance/maintenance-activity-types` | Group-gated list/detail and protected standard records |

Actors: Administrator/manager, Maintenance User, ordinary Fleet user,
unauthenticated user, and wrong-company scope. Stable fixtures include
`maintenance-demo-001..004`, `equipment-demo-001..003`,
`maintenance-team-metrology`, `maintenance-team-subcontractor`,
`maintenance-category-computers`, and the fixed stages/activity types.

## Functional and data cases

| Case ID | Class | Route/action | Setup/actor | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MAINT-FUNC-001 | functional | Dashboard/team cards | Admin, seeded teams | Each card opens the correctly scoped request facet and preserves team context | dashboard action tests | pass |
| MAINT-FUNC-002 | functional | Requests list/detail | Maintenance User | Search, filter, group, sort, paginate, open and edit request | request tests | pass |
| MAINT-FUNC-003 | functional | Request create/edit | Maintenance User | Required fields, assignment, priority, dates, recurrence, instructions and description persist after reload | request contract/workflow tests | planned |
| MAINT-FUNC-004 | functional | Request archive/reopen | Maintenance User | Cancel/archive and reopen update state, archived flag, row version and visible action | archive tests; browser smoke | pass |
| MAINT-FUNC-005 | functional | Kanban state | Maintenance User | Ready/In Progress/Blocked transitions validate values and stale row versions | kanban-state tests | pass |
| MAINT-FUNC-006 | functional | Equipment list/detail | Maintenance User | Search, edit, archive/reopen, open maintenance-request stat action | equipment lifecycle/stat tests | pass |
| MAINT-FUNC-007 | functional | Teams and categories | Manager | Create/edit/delete and linked-record protection work with deterministic counts | team/category tests | pass |
| MAINT-FUNC-008 | functional | Stages/activity types | Manager/group-gated user | Search, detail, create/update/delete where allowed; standard rows protected | stages/activity tests | pass |
| MAINT-FUNC-009 | functional | Calendar/reporting | Admin | Calendar facets and report graph/pivot measures match request scope | route matrix; report contracts | pass for report contract; paired visual remains open |
| MAINT-FUNC-010 | functional | Settings | Manager | Update custom worksheets setting and reload persisted value | settings contract | planned |
| MAINT-FUNC-011 | data | Migrations/demo | Clean and existing development DB | Rerun schema/demo migrations; fixed IDs and dates produce no duplicates | focused suite | pass |
| MAINT-FUNC-012 | data | Empty/not-found/error | All list/detail routes | Explicit empty, missing, transport-error and invalid-input states contain no fabricated data | focused suites; matrix | pass |
| MAINT-FUNC-013 | functional/data | Maintenance Requests Analysis Graph/Pivot | Admin, persisted maintenance fixtures | Active default and Cancelled filter scope real rows; Graph exposes Duration, Repeat Every, Count and Responsible/Stage dimensions; Pivot exposes source-aligned fields; empty and restart results remain deterministic | `evidence/maintenance/2026-09-22/MAINT-ANALYSIS-REPORT-001/`; `maintenance_analysis_reporting.integration.test.ts` | pass |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Action | Expected transition/side effect | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MAINT-WF-001 | workflow | Request lifecycle | Cancel then Reopen | State/archive and row version change; reopened request returns to active list | stale/missing request returns 409/404 without partial update | pass |
| MAINT-WF-002 | workflow | Kanban state lifecycle | Update state | `ready`, `in_progress`, and `blocked` values persist and are reflected in detail | invalid state and stale version return stable 422/409 | pass |
| MAINT-WF-003 | integration | Equipment stat action | Open active requests | Filtered request count/list matches selected equipment | missing equipment returns safe empty/not-found state | pass |
| MAINT-WF-004 | integration | Team/category stat actions | Open linked counts | Requests/equipment are scoped to selected team/category | deleted/in-use parent cannot leave dangling links | pass |
| MAINT-WF-005 | integration | Activities/chatter/attachments | Schedule, complete, message, note, instruction | Author, content, state and audit history persist and render | blank, unauthorized, retry and missing-record paths are explicit | planned |
| MAINT-WF-006 | integration | Recurrence/scheduled maintenance | Run scheduled event | Next date and generated request are deterministic and idempotent | retry/duplicate event does not duplicate work | planned |
| MAINT-WF-007 | integration | Durable/third-party boundary | Review future external side effects | Any cross-module, timer, external API or long-running workflow is declared for Temporal | retry, timeout, compensation, replay/restart and shutdown tests precede activation | planned |
| MAINT-WF-008 | integration | Recurring request occurrence API boundary | Generate next occurrence | Preventive repaired requests copy to the next deterministic date with stable lineage and a one-generation marker | stale, duplicate, invalid, missing, ineligible, and restart paths return stable errors without partial writes | pass |

## Permission and security cases

| Case ID | Actor/scope | Route/action | Expected result | Direct enforcement | Status |
| --- | --- | --- | --- | --- | --- |
| MAINT-PERM-001 | Administrator/manager | All routes and manage/settings actions | Full configured menu and mutations available | API allows valid manager operations | planned |
| MAINT-PERM-002 | Maintenance User | Requests/equipment write actions | Ordinary CRUD and workflow actions allowed; manager-only actions hidden | Direct API checks `maintenance.write` | planned |
| MAINT-PERM-003 | Ordinary Fleet user | Maintenance mutation and manager actions | 403 and no database changes | Direct `/api/mutate` denial | planned |
| MAINT-PERM-004 | Group-gated user | Stages/activity types | Only permitted restricted actions visible/available | Group permission checked on route and API | pass |
| MAINT-PERM-005 | Wrong company/scope | Detail/stat/mutation | No cross-company leakage or update | 404/403 and unchanged rows | planned |
| MAINT-PERM-006 | Unauthenticated/expired | Every route/API | Redirect/401/403 with no data leakage | Direct request and browser evidence | planned |
| MAINT-PERM-007 | Concurrency | Any update/delete/workflow | Stale row version returns 409 and preserves current record | mutation guard/query evidence | pass |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| MAINT-UI-001 | Dashboard and request list | 1440x900, 390x844 | Odoo menu order, view tabs, cards, filters, labels, spacing and no overflow | fresh 32-check matrix | partial |
| MAINT-UI-002 | Request detail normal/cancelled | both | Statusbar, actions, fields, chatter and responsive forms match | browser cancel/reload smoke; paired captures pending | partial |
| MAINT-UI-003 | Equipment/team/category forms | both | Stats, sections, actions, list/kanban/card layout and empty states match | route matrix; Odoo captures pending | partial |
| MAINT-UI-004 | Reporting/settings/restricted forms | both | Graph/pivot/settings/full-width behavior, loading/error and permission states match | Odoo reference captures in `MAINT-ANALYSIS-REPORT-001`; authenticated Core3 capture blocked | partial |
| MAINT-UI-005 | Browser regression | all 16 registered routes | No page/request errors, blank/redirect states or horizontal overflow | fresh 32-check matrix | pass |

## Exit criteria

- Every visible and deliberately restricted Maintenance action has a case.
- Full parity requires focused contract, database persistence, permission,
  workflow, authenticated browser, and paired Odoo evidence; route smoke alone
  is not module sign-off.
