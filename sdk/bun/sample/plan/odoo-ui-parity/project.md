# Project UI parity

Status: in progress

This is an implementation gate for the Odoo 19 Project addon. The first
bounded implementation batch covers the Projects collection, project detail
with embedded task navigation, My Tasks, and task detail. The broader Project
addon remains open for later batches.

## Reference gate

- Odoo source: `/home/nhanjs/projects/odoo`, branch `19.0`, source revision
  `65975996`.
- Addon manifest: `/home/nhanjs/projects/odoo/addons/project/__manifest__.py`.
  Project is an application and depends on `analytic`, `base_setup`, `mail`,
  `portal`, `rating`, `resource`, `web`, `web_tour`, and `digest`.
- The manifest declares official demo files
  `data/mail_template_demo.xml` and `data/project_demo.xml`. The source demo
  file contains projects, tasks, users, stages, milestones, followers,
  activities, and related mail records; it is the source fixture reference,
  not evidence that the local live database contains those records.
- Authenticated live audit on 2026-09-10 used `http://localhost:8069`, the
  disposable reference database `core3_reference`, and `codex@core3.local`.
  Project is installed with demo data: four Projects cards and 32 All Tasks
  rows were visible. This is the reference database for this batch; it is
  separate from the source demo contract and may be recreated by the local
  Compose stack at `/home/nhanjs/projects/odoo-core3-reference`.

## Live screenshot evidence

Authenticated Project captures were taken headlessly after login at 1440x900
and 390x844. The Project list has no failed responses and fits the mobile
viewport exactly (`scrollWidth === 390`). The mobile project detail keeps the
purple Odoo shell, New/action controls, Share Project, project fields, tags,
planned-date range, and Description/Settings tabs without horizontal overflow.

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Project kanban/list | `/tmp/odoo-project-installed-home-desktop.png`, `/tmp/odoo-project-list-desktop.png` | `/tmp/odoo-project-mobile-installed.png` |
| Project detail (`/odoo/project/5`) | `/tmp/odoo-project-detail-id5-desktop.png` | `/tmp/odoo-project-detail-id5-mobile.png` |
| My Tasks / All Tasks | `/tmp/odoo-my-tasks-settled-desktop.png`, `/tmp/odoo-all-tasks-settled-desktop.png` | route inventory captured; mobile follow-up remains open |

The captures use source revision `65975996`, database `core3_reference`, the
personal user above, and the stated viewport. Screenshots remain under `/tmp`
and are not committed. The browser skill's persistent `js_repl` was not
exposed in this session; the fallback authenticated Playwright runner was
used and this tooling limitation is recorded rather than hidden.

### Observed Project labels and behavior

- `/odoo/project` shows the shell labels `Project`, `Projects`, `Tasks`,
  `Reporting`, and `Configuration`, then `New`, `Projects`, the `1-4 / 4`
  pager, and cards for `Home Construction`, `Office Design`, `Renovations`,
  and `Research & Development`. Each card exposes customer/company context,
  planned-date range where present, colored tags, task count/progress, and a
  menu. `Kanban View` and `List View` are explicit controls. List mode shows
  `Name`, `Customer`, `Company`, `Project Manager`, and `View Tasks`.
- Opening `/odoo/project/5` shows `Projects`, `Home Construction`, `Tasks`,
  `0 / 0 (0%)`, `Dashboard`, `2 Status`, `Share Project`, `Name of the Tasks?`,
  `Customer`, `Tags`, `Company`, `Project Manager`, `Planned Date`,
  `Description`, `Settings`, `Send message`, `Log note`, and `Activity`.
  Desktop uses the project form/dashboard; mobile collapses the same fields
  into a single column and keeps Share Project plus the Description/Settings
  tabs usable.
- `/odoo/my-tasks` opens the `My Tasks` activity board with `Open`, `Inbox`,
  relative date groups, `Done`, and `Cancelled`. `/odoo/all-tasks` opens
  `All Tasks`, `Open`, `1-32 / 32`, and columns `Title`, `Project`,
  `Assignees`, `Priority`, `Next Activity`, `Tags`, and `Stage`; its controls
  include List, Kanban, Calendar, Activity, Pivot, and Graph views.
- Direct `/odoo/project`, `/odoo/my-tasks`, `/odoo/all-tasks`, and
  `/odoo/project/5` navigation returned no failed responses in the desktop
  audit. Project mobile list/detail both reported no horizontal overflow.

## Source menu, action, route, and view inventory

The following is the source-defined admin/role-visible inventory. `Live route`
is the Odoo web-client action path when the action declares `path`; otherwise
it is a deterministic Core3 planning alias to be assigned during
implementation. These are not HTTP controller routes. Visibility is governed
by the listed source groups and by installed dependency modules.

| Menu | XML menu ID | Action | Model | Live route / planned alias | View modes |
| --- | --- | --- | --- | --- | --- |
| Projects | `menu_projects` | `open_view_project_all` | `project.project` | `/odoo/project` | `kanban,list,form` |
| Projects (grouped by stage) | `menu_projects_group_stage` (`project.group_project_stages`) | `open_view_project_all_group_stage` | `project.project` | generated action route; planned `/odoo/project-by-stage` | `kanban,list,form,calendar,activity` |
| Tasks > My Tasks | `menu_project_management_my_tasks` | `action_view_my_task` | `project.task` | `/odoo/my-tasks` | `kanban,list,form,calendar,activity,pivot,graph` |
| Tasks > All Tasks | `menu_project_management_all_tasks` | `action_view_all_task` | `project.task` | `/odoo/all-tasks` | `list,kanban,form,calendar,activity,pivot,graph` |
| Reporting > Tasks Analysis | `menu_project_report_task_analysis` | `project.action_project_task_user_tree` | `project.task` | source action alias; planned `/odoo/tasks-analysis` | list/graph/pivot (source action inherited; verify on install) |
| Reporting > Customer Ratings | `rating_rating_menu_project` | `rating_rating_action_project_report` | `rating.rating` | dependency action alias; planned `/odoo/customer-ratings` | dependency-defined list/kanban/form/report views |
| Configuration > Settings | `project_config_settings_menu_action` (`base.group_system`) | `project_config_settings_action` | `res.config.settings` | generated action route | `form` |
| Configuration > Projects | `menu_projects_config` | `open_view_project_all_config` | `project.project` | `/odoo/project-configuration` | `list,kanban,form` |
| Configuration > Projects (grouped) | `menu_projects_config_group_stage` (`project.group_project_stages`) | `open_view_project_all_config_group_stage` | `project.project` | generated action alias | `list,kanban,form,calendar,activity` |
| Configuration > Project Stages | `menu_project_config_project_stage` (`project.group_project_stages`) | `project_project_stage_configure` | `project.project.stage` | `/odoo/project-stages` | `list,kanban,form` |
| Configuration > Task Stages | `menu_project_config_project` (`base.group_no_one`) | `open_task_type_form` | `project.task.type` | source action alias; technical-only | source-defined task-stage views |
| Configuration > Tags | `menu_project_tags_act` | `project_tags_action` | `project.tags` | `/odoo/task-tags` | source default; verify installed action metadata |
| Configuration > Project Roles | `project_menu_config_project_roles` | `project_roles_action` | `project.role` | generated action alias | `list,kanban,form` |
| Configuration > Activity Types | `project_menu_config_activity_type` | `mail_activity_type_action_config_project_types` | `mail.activity.type` | `/odoo/project-activity-types` | `list,kanban,form` |
| Configuration > Activity Plans | `mail_activity_plan_menu_config_project` | `mail_activity_plan_action_config_project_task_plan` | `mail.activity.plan` | `/odoo/project-activity-plans` | `list,kanban,form` |

The top-level Project menu itself requires
`group_project_manager,group_project_user`. Stage-grouped entries require
`project.group_project_stages`; Configuration requires
`project.group_project_manager`; Settings additionally requires
`base.group_system`; Task Stages is `base.group_no_one` and is not an
ordinary-user parity target. Source-linked embedded or form actions also
include project Dashboard/Tasks/Milestones, subtasks, burndown, share,
duplicate/template, send email, followers, and task/project drilldowns. They
must be tested as record actions, not incorrectly promoted to top-level menus.

## View and interaction state inventory

- Project collection: kanban cards, list, form, calendar, activity, and
  stage-grouped kanban/list. Cover favorite, customer, dates, alias, tags,
  project manager, task/milestone counters, activity indicators, progress
  status (`on_track`, `at_risk`, `off_track`, `on_hold`, `done`), templates
  excluded by the menu domain, no-record help, loading, error, and denied
  states.
- Project form/dashboard: header status, editable/read-only fields, project
  stages, tags, customer/user relations, dates, milestones, tasks, updates,
  chatter/followers/activities, ratings, attachments, sharing, duplicate,
  convert-to-template, archive/delete, and embedded Dashboard/Tasks/Milestones
  actions. Cover project with no tasks/milestones and feature-disabled states.
- Tasks: My Tasks and All Tasks default-open filters, kanban/list/form/calendar/
  activity/pivot/graph, search and filter facets (stage, project, milestone,
  assignee, tags, deadline, priority, customer), group-by and measures,
  subtasks, recurrence, dependencies, deadlines, planned/spent hours,
  personal stages, chatter, activities, create/edit/assign/start/complete/
  cancel, share, and empty/error/denied/conflict states.
- Configuration/reporting: project configuration list/kanban/form, project
  stages list/kanban/form, tags, roles, activity types/plans, settings form,
  tasks analysis, and customer ratings. Cover create/edit/archive/delete,
  stage ordering and restrictions, filters/grouping, pivot/graph empty data,
  settings save/validation, and dependency-disabled states.
- Common controls: search, saved/default filters, group-by, optional columns,
  bulk actions, pagination, row open/double-click, breadcrumbs, action menus,
  status chips/bar, many2one/many2many selectors, date ranges, company and
  user scope, dialogs, optimistic refresh, stable errors, and responsive
  overflow. Mobile must retain usable action menus/forms without horizontal
  page overflow.

## Existing Core3 surface and parity gap

`services/project` now contains page-id API fragments and the first bounded
implementation batch:

- `/projects` (`projects`): service-owned project ListView with Odoo list and
  kanban modes, search, state/stage filters, deterministic empty fixture, and
  project navigation;
- `/project-analysis` (`project-analysis`): five totals and a status chart;
- `/projects/detail` (`project-detail`): project OdooFormView plus an embedded
  service-owned task ListView whose rows navigate to `/tasks/detail`;
- `/tasks` (`project-tasks`): task ListView and kanban navigation with search,
  filters, deterministic empty fixture, and row navigation;
- `/tasks/detail` (`project-task-detail`): task OdooFormView with guarded
  start/complete/cancel actions;
- `project_tasks` workflow: Todo/In Progress/Done/Cancelled transitions.

The bounded batch moves list/detail/task reads into
`services/project/api/{projects,project-detail,tasks,task-detail}.yaml`, keyed
by `page.id`. Queries accept stable `q`, filter, `id`, and `fixture_state`
parameters so default, search/no-match, empty, and missing-detail behavior can
be tested without browser fixtures. Project stage filter values match the
seeded stage names. Fresh authenticated Core3 checks now show two Project
cards and five Task cards at 390x844, with no table, no failed responses, and
`scrollWidth === 390`; desktop list/detail/task checks also have no failed
responses. The task side-panel reference was aligned to
`project-task-detail.yaml`, removing the prior `GET /api/pages/task-detail`
404. Evidence is `/tmp/core3-project-projects-mobile-cards-verified.png`,
`/tmp/core3-project-tasks-mobile-cards-verified.png`, and
`/tmp/core3-project-tasks-desktop-fixed.png`. The current schema only has
projects, milestones, and
denormalized project_tasks. It lacks
project stages, task types/personal stages, tags, roles, users/partners,
companies, followers/chatter/attachments, activities/plans, ratings, updates,
recurrence/dependencies/subtasks, templates, sharing/portal projections,
timesheet/profitability, archive/security scope, and report/settings models.
The demo migration uses `CURRENT_DATE` and `CURRENT_DATE + INTERVAL`, so it is
not a deterministic seeded-date fixture. The workflow handler is currently
`order_transition`, which must not be reused as an accidental Project API
boundary without a verified generic workflow contract.

## Completed bounded slice: Project configuration (2026-09-10)

The next disjoint slice closes the Odoo Project Configuration surfaces for
Project Stages, Tags, and Project Roles. Source XML and the authenticated
`core3_reference` database were checked against Odoo 19: Project Stages is
list/kanban/form with `Name` and `Folded`, Tags is list/form with `Name` and
`Color`, and Project Roles is list/kanban/form with an `Archived` filter (the
reference database has no role demo rows). Core3 routes are `/project-stages`,
`/task-tags`, and `/project-roles`, exposed under the manager-only Project >
Configuration menu.

The slice adds page-id-bound API fragments and layout-only pages, side-panel
forms, stable configuration fixtures, idempotent migrations, create/update/
archive/delete mutations, duplicate-name guards, row-version conflict
handling, empty/no-match/not-found/error datasource branches, and focused
integration coverage. Evidence is captured under `/tmp` as
`odoo-project-next-*` and `core3-project-next-*`; screenshots are not
committed. The repository-wide `audit-odoo-mock-data.ts` remains a known
baseline limitation: it reports missing `mock_data` on 324 SQL-backed pages,
including the pre-existing Project pages; this slice keeps SQL datasources
live rather than replacing them with browser fixtures.

## Required shared primitives

Reuse generic contracts before adding Project-specific renderers:

- Odoo `ListView`, responsive card/kanban, `OdooFormView`/`FormView`,
  `CalendarView`, `ActivityView`, `PivotView`, `GraphView`/`Chart`, `ContactGrid`,
  `StatRow`, `StatusBar`, `StatusChip`, pager, optional columns, bulk actions,
  search/filter/group-by, saved views, and responsive action menus;
- notebook/tabs and embedded-action shell, project/task status selection,
  progress/status indicator, favorite toggle, many2one/many2many tag and user
  avatar fields, date-range/deadline fields, recurrence/dependency editors,
  chatter/follower/activity/attachment panels, and report/download result;
- permission-aware server forms/actions, row-version conflict handling,
  validation dialogs, stable 401/403/404/409/422 errors, empty/loading/error
  states, and content-only mobile scrolling;
- `SettingsView` with the established Odoo full-width settings layout. If a
  primitive is missing, plan and test the generic contract first rather than
  creating a page-specific replacement.

## Deterministic service-owned datasource/API/mock contract

Frontend pages must be layout-only. Move all reads and mutations into
convention-discovered `services/project/api/*.yaml` fragments keyed by
`page.id`; use declared service operations for cross-service contacts/users,
ratings, mail/activity, portal, and timesheet data. No page-local records,
random IDs, `CURRENT_DATE`, browser fixtures, remote assets, or live Odoo
calls are allowed. Each datasource must declare stable `mock_data` until its
service query exists, and API discovery must be verified without adding the
fragments to a frontend `pages:` manifest.

Use an explicit fixture seed date of `2026-01-15`, stable IDs, stable ordering,
and idempotent migrations for DuckDB and supported adapters. Seed enough data
for active/archived/template projects, multiple stages, tasks in every open
and closed state, overdue/upcoming/no-deadline tasks, milestones, tags,
users/assignees, customers, followers, activities, ratings, updates,
attachments, recurrence/dependency/subtask examples, and empty result sets for
every collection/report. Include ordinary user, project user, manager, stage/
milestone-enabled, system/settings, portal/share, and denied users; include
company and project visibility boundaries.

Required operation coverage includes project/task/stage/tag/role/activity-plan
CRUD, task start/complete/cancel, assign/favorite/archive, milestone update,
hours/update/chatter/activity/follower/attachment mutations, share/portal
access, template conversion, report requests, and settings updates. Guards
must enforce permissions, company/project scope, valid state transitions,
required relations, no duplicate names where Odoo requires uniqueness,
row versions, and stable conflict/validation messages. Return deterministic
401/403/404/409/422 responses and test no-data, loading, server-error, and
dependency-disabled branches. Report actions must be permission-checked and
must not expose arbitrary raw report paths.

## Source routes and controller boundary

Odoo action routes are web-client aliases, not Python HTTP endpoints. The
source action paths are `/odoo/project`, `/odoo/my-tasks`, `/odoo/all-tasks`,
`/odoo/project-configuration`, `/odoo/project-stages`,
`/odoo/task-tags`, `/odoo/project-activity-types`, and
`/odoo/project-activity-plans`; the remaining action aliases require an
installed database to observe and must be assigned explicit Core3 aliases.
The Project addon also defines authenticated/public portal HTTP routes in
`addons/project/controllers/portal.py`: `/my/projects`,
`/my/projects/page/<int:page>`, `/my/projects/<int:project_id>`, its
`project_sharing` subpath, project task/subtask/recurring-task routes,
`/my/tasks`, `/my/tasks/page/<int:page>`, `/my/tasks/<int:task_id>`, and the
authenticated `/project_sharing/attachment/add_image` POST route. Treat
portal/share as a separate permissioned Core3 surface; do not copy an
unscoped public endpoint.

## Acceptance gate

- The implementation maps every source menu row above to a Core3 route or a
  documented deliberate redirect, preserves group visibility, and keeps the
  `base.group_no_one` Task Stages action technical-only. Record-linked actions
  are separately covered and are not silently omitted.
- Authenticated Playwright navigation starts at the Core3 Project menu and
  covers every enabled route/action at 1440x900 and 390x844. Direct URL checks
  alone do not sign off navigation. If the reference Odoo addon remains
  uninstalled, the test report repeats that limitation and uses source XML as
  the action/view contract rather than claiming live parity.
- Reference comparison uses `/tmp/odoo-project-desktop.png` and
  `/tmp/odoo-project-mobile.png` only for the Apps-page limitation. Installed
  Project screenshots are required before visual sign-off; never invent or
  rename the uninstalled captures as installed evidence. Assert visible menu,
  title, records, failed requests, no horizontal overflow, and usable mobile
  forms/actions.
- Functional checks cover all listed collection/form/kanban/calendar/activity/
  pivot/graph/settings states, controls, filters, empty/loading/error/denied
  branches, dialogs, embedded actions, portal/share routes, and report
  outcomes. Assert fields/actions against the source XML and source models.
- Workflow checks cover task/project/stage/milestone transitions, assignment,
  favorites, archive/template/share, activities/chatter/ratings, recurrence,
  subtasks/dependencies, settings, company/role/row-version boundaries, and
  stable error responses.
- Datasource checks prove service ownership, API-fragment discovery by
  `page.id`, declared service operations for cross-service reads, stable
  `2026-01-15` seed ordering/IDs, no page-local records or remote assets,
  idempotent fresh install/upgrade, mock-data coverage, and deterministic
  empty/error/permission responses.
- Run focused project YAML parse/schema/discovery checks, migration checks for
  DuckDB and supported adapters, project mock-data/catalog checks, markdown
  link/table checks, authenticated Core3 browser smoke at both viewports,
  source/live limitation checks, and `git diff --check`. Screenshots stay
  under `/tmp`; the implementation commit may contain only the approved
  Project YAML/TS/docs for its batch.
