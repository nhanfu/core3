# Project detailed QA test plan

Module: project  
QA owner: project-qa  
Developer owner: project module owner  
Reference addon/version: project, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-21

This plan follows [`project.md`](../../project.md); executed evidence is in
[`../project.md`](../project.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Projects/tasks | `/project/projects`, `/project/my/projects`, `/project/projects/detail*`, `/project/tasks`, `/project/tasks/detail` | List/grouped stages, project dashboard, task detail, milestones, updates, Sub-tasks/child_ids and Timesheets tab |
| Reporting/portal | `/project/analysis`, `/project/tasks-analysis`, `/project/customer-ratings`, `/project/*/detail`, `/project/my/projects/task/detail` | Graph/pivot/list reports, ratings, customer portal project/task read-only views |
| Configuration | stages, roles, tags, activity types/plans, settings routes | List/form CRUD, archive, manager settings and guards |

The browser topology is `project,timesheets`, because task detail invokes the
declared `yaml.service.timesheets` service. Fixtures include stable projects,
tasks, milestones, updates, stages, roles, tags, activities, ratings and portal
records. Actors are Project Manager, Project User, portal user, Fleet ordinary
user, wrong-company user and unauthenticated user.

## Functional and data cases

| Case ID | Class | Surface | Expected result and persistence assertion | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| PROJECT-FUNC-001 | functional | Project/task lists | Search/filter/group/sort/paginate, switch views and open valid project/task records | focused suite; matrix | pass |
| PROJECT-FUNC-002 | functional | Project detail/dashboard | Edit project, dashboard cards, milestones and updates; reload preserves values | focused tests | pass at contract level |
| PROJECT-FUNC-003 | functional | Task detail | Edit task fields, status, priority, assignee, tags and Timesheets tab | task-detail tests; dependency matrix | pass at contract level |
| PROJECT-FUNC-004 | functional | Configuration | CRUD stages/roles/tags/activity types/plans/settings with validation and archive guards | configuration suites | pass |
| PROJECT-FUNC-005 | functional | Reporting/ratings | Analysis, task analysis, customer ratings and grouped-stage rows use real scoped data | reporting suites | pass |
| PROJECT-FUNC-006 | functional | Portal | Portal project/task/detail preview is read-only and project-scoped | portal suites | pass |
| PROJECT-FUNC-007 | data | Empty/error/not-found | Every route has deterministic empty, missing, forbidden and transport-error states | focused suites; matrix | pass at contract level |
| PROJECT-FUNC-008 | data | Migrations/seeds | Reapply schema/demo fixtures without duplicates, random IDs or moving dates | focused suite | pass |
| PROJECT-FUNC-009 | functional | Import/export/attachments | Exercise task/project file, attachment, import/export and print actions where exposed | browser interaction gate | planned |
| PROJECT-FUNC-010 | functional | Task detail Sub-tasks | Add, edit, search, open and delete child tasks; reload preserves relation and parent completion summary | `PROJECT-TASK-SUBTASKS-001`; focused suite; Odoo/Core3 captures | conditional pass |

## Workflow and integration cases

| Case ID | Class | Workflow/integration | Expected result | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| PROJECT-WF-001 | workflow | Task lifecycle | Planning → In Progress → Done/Cancelled and reopen paths update row versions | forbidden/stale state returns 409 with no partial update | pass at contract level |
| PROJECT-WF-002 | workflow | Milestone/update | Reach milestone and publish dashboard update with linked project state | invalid project/missing milestone is explicit | pass at contract level |
| PROJECT-WF-003 | integration | Timesheets | Task detail calls Timesheets service and displays task-scoped hours/approval state | missing dependency/downstream failure is visible and source unchanged | pass at route level |
| PROJECT-WF-004 | integration | Portal/customer rating | Portal actions and rating data remain scoped to project/task and read-only where declared | unauthorized or stale token returns safe denial | planned |
| PROJECT-WF-005 | integration | Durable/external boundary | Mail, timers, customer callbacks and cross-module workflows use Temporal when long-running | retry/timeout/compensation/replay/restart/shutdown required | planned |
| PROJECT-WF-006 | workflow | Sub-task lifecycle | Child states accept Todo/In Progress/Done/Cancelled; stale parent/child versions and active descendants block unsafe writes | 409/422 with unchanged rows; restart query remains durable | pass at contract level |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| PROJECT-PERM-001 | Project Manager | Full project/configuration/task mutations allowed | planned |
| PROJECT-PERM-002 | Project User | Ordinary project/task reads and writes within scope | planned |
| PROJECT-PERM-003 | Portal user | Only published portal project/task surfaces visible | planned |
| PROJECT-PERM-004 | Fleet ordinary user | Project settings/direct mutations return 403 and do not change data | route boundary pass; mutation probe planned |
| PROJECT-PERM-005 | Wrong company/branch | No project/task/timesheet leakage or update | planned |
| PROJECT-PERM-006 | Unauthenticated/expired | Redirect/401/403 without data leakage | planned |
| PROJECT-PERM-007 | Stale/missing | 409/404/422 with unchanged current row | pass at contract level |
| PROJECT-PERM-008 | Sub-task relation | `project.read` lists/opens; `project.write` adds/edits/deletes; wrong-company and inactive records are denied or empty | focused suite and API guards | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| PROJECT-UI-001 | Projects/tasks/dashboard | 1440x900, 390x844 | Odoo menu, tabs, kanban/list, dashboard sections, labels and overflow match | partial |
| PROJECT-UI-002 | Task detail/Timesheets | both | Form sections, status/actions, embedded Timesheets and responsive behavior match | partial |
| PROJECT-UI-003 | Portal/report/configuration | both | Read-only portal, graph/pivot/list, settings and permission states match | partial |
| PROJECT-UI-004 | Current route regression | all 27 manifest routes | 54 dependency-aware authenticated checks with no errors, blank states or overflow | pass |
| PROJECT-UI-005 | Task detail/Sub-tasks | 1440x833, 390x844 | Odoo tab/grid labels, Add a line affordance, child rows and responsive no-overflow state match | Odoo and Core3 evidence; task-detail gate blocked by missing Timesheets service | conditional |

## Exit criteria

- Every current Project route/action family has functional, security,
  persistence, responsive and visual cases.
- Full sign-off requires browser CRUD/actor probes, restart persistence, and
  paired Odoo comparison in addition to the dependency-aware route matrix.
