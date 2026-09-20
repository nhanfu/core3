# CRM detailed QA test plan

Module: crm  
QA owner: crm-qa  
Developer owner: CRM module owner  
Reference addon/version: crm, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows the CRM source/menu inventory in [`crm.md`](../../crm.md).
Executed results and runtime topology notes are in [`../crm.md`](../crm.md).

## Coverage inventory

| Menu/action family | Core3 routes | View/state scope |
| --- | --- | --- |
| Pipeline | `/crm/leads`, `/crm/my-pipeline`, `/crm/unassigned-leads`, `/crm/unattended-leads`, `/crm/quality-leads`, `/crm/lead-detail` | List/Cards/Kanban/Calendar/Pivot/Graph/Map, filters, assignment and detail workflow |
| Reporting | `/crm/analysis`, `/crm/leads-analysis`, `/crm/activity-analysis`, `/crm/forecast`, `/crm/expected-revenue`, `/crm/lost-opportunities` | Graph/Pivot/List/report filters, archived/lost/forecast states |
| Activities | `/crm/crm-activities`, `/crm/crm-activity-detail`, `/crm/activity-types`, `/crm/activity-types/detail` | Queue, detail, scheduling/completion, type administration |
| Configuration | `/crm/configuration`, `/crm/settings`, `/crm/teams`, `/crm/team-detail`, `/crm/team-opportunities`, `/crm/team-members`, `/crm/stages`, `/crm/stages/detail`, `/crm/tags`, `/crm/tags/detail`, `/crm/lost-reasons`, `/crm/lost/reason/detail`, `/crm/recurring-plans` | List/form, team-scoped opportunity CRUD/assignment, technical member CRUD/toggle, manager archive, relation and configuration guards |

The dependency-aware browser topology is `crm,base,order`: CRM contact
lookups use `yaml.service.base`, and quotation handoff uses
`yaml.service.order`. Fixtures include deterministic CRM leads, teams, stages,
tags, lost reasons, activities, recurring plans, contacts and order handoff
records. Admin/manager, CRM user, Fleet ordinary user, wrong-company, and
unauthenticated actors are required.

## Functional and data cases

| Case ID | Class | Route/action | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| CRM-FUNC-001 | functional | Pipeline list/detail | Search/filter/group/sort/paginate and open lead detail across all declared views | CRM suite; dependency-aware matrix | pass |
| CRM-FUNC-002 | functional | Lead create/edit | Required and optional fields, contact lookup, attribution, revenue/date defaults persist after reload | CRM browser create tests | pass |
| CRM-FUNC-003 | functional | Assign/merge/convert | Assign to me, merge selected records, convert to contact/opportunity, and quotation handoff update related state | CRM integration tests | pass |
| CRM-FUNC-004 | functional | Activities | Schedule, complete, chain next activity, filter queue and preserve chatter completion | CRM integration/activity tests | pass |
| CRM-FUNC-005 | functional | Tags/stages/lost reasons | Manager CRUD, archive/restore, validation, in-use and propagation guards persist | focused action tests | pass |
| CRM-FUNC-006 | functional | Teams/recurring plans | Team and plan CRUD/settings and active-member routing are deterministic | focused tests | pass |
| CRM-FUNC-010 | functional | Team opportunities/members | Team stat opens scoped opportunities; create/edit/assign and technical member add/toggle persist with duplicate and closed guards | `crm_team_opportunities`, `crm_team_members` suites | pass |
| CRM-FUNC-007 | functional | Reports/forecast | Pipeline, leads, activities and forecast reports return real scoped graph/pivot/list rows | reporting tests | pass |
| CRM-FUNC-008 | data | Empty/error/not-found | Every list/detail/report handles empty, no-result, missing and transport failure without fabricated rows | contract tests | pass |
| CRM-FUNC-009 | data | Migration/seed | Reapply deterministic schema/demo data on clean/existing dev DB | Fixed IDs/dates, no duplicate records | focused suites | pass |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected transition/side effect | Failure/recovery assertion | Status |
| --- | --- | --- | --- | --- | --- |
| CRM-WF-001 | workflow | Lead pipeline | New → Qualified → Proposition → Won/Lost and reopen update probability/lost reason/history | Forbidden/stale transitions return 409 without partial changes | pass |
| CRM-WF-002 | workflow | Activity plan | Apply plan, sequence steps, due dates and owner; completion chains next step | Closed lead and inactive activity type are rejected | pass |
| CRM-WF-003 | integration | Contact conversion | CRM calls allowlisted Base contact service and links returned contact id | Missing Base permission/service failure is surfaced; no orphan lead mutation | pass |
| CRM-WF-004 | integration | Quotation handoff | CRM calls allowlisted Orders service with selected lead/order context | Missing Orders dependency or downstream failure is explicit and source remains consistent | pass at contract level |
| CRM-WF-005 | integration | Chatter/followers/attachments | Message/note/follower/attachment actions persist in activity/history surfaces | Blank content, unauthorized and retry paths are guarded | planned |
| CRM-WF-006 | integration | Durable boundary | Long-running external campaign/mail or cross-module workflow is declared for Temporal | Replay/restart, retry, timeout and compensation required before activation | planned |

## Permission and security cases

| Case ID | Actor/scope | Route/API/action | Expected result | Status |
| --- | --- | --- | --- | --- |
| CRM-PERM-001 | Administrator/manager | CRM configuration and mutation actions | Full allowed menu and manager operations | planned |
| CRM-PERM-002 | CRM User | Lead/activity ordinary CRUD | `crm.read/write` operations allowed within scope | planned |
| CRM-PERM-003 | Fleet ordinary user | CRM routes/direct mutation | 403 and no database mutation | planned |
| CRM-PERM-004 | Without Base contact write | Conversion | Contact-creating conversion hidden/denied while read-only conversion remains safe | pass at contract level |
| CRM-PERM-005 | Without Orders permission | Quotation handoff | Handoff denied directly and source lead is unchanged | pass at contract level |
| CRM-PERM-006 | Wrong company/branch | Lead/detail/activity | No cross-scope leakage or update | planned |
| CRM-PERM-007 | Unauthenticated/expired | all CRM routes/APIs | Redirect/401/403 with no data leakage | planned |
| CRM-PERM-008 | Stale/missing | all mutations | 409/404/422 and unchanged current row | pass |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| CRM-UI-001 | Pipeline list/detail | 1440x900, 390x844 | Menu order, tabs, cards/kanban, fields, actions, text and Odoo responsive geometry | partial |
| CRM-UI-002 | Create/edit/convert dialogs | both | Required/optional controls, contact lookup, validation and modal focus behavior | partial |
| CRM-UI-003 | Activity/configuration forms | both | Lists/forms, filters, chatter, status/actions and permission visibility | partial |
| CRM-UI-004 | Reporting | both | Graph/pivot/list measures, creation-month grouping, empty/loading/error states | partial |
| CRM-UI-005 | Current route regression | all 28 manifest route entries | 56 authenticated checks on `crm,base,order`; no page/request errors, HTTP errors, blank states or overflow | pass |

## Exit criteria

- Every current CRM route/action family has a planned functional, security,
  responsive, and persistence case.
- A CRM-only runner is not accepted for dependent screens; dependency-aware
  topology must be used for browser evidence.
- Full sign-off still requires paired Odoo captures, actor mutation probes,
  and complete interaction coverage.
