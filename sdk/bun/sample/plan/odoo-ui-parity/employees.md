# Employees UI parity

## EMP-LAUNCH-PLAN-001: Launch Plan bounded workflow (2026-09-20)

Odoo source comparison selected the unfinished employee-form
`plan_wizard_action`: `hr_employee_views.xml` exposes `Launch Plan` for
`hr.group_hr_user`, opening `mail.activity.schedule` in `plan_mode` with
`active_model: hr.employee`; the wizard expands ordered activity-plan
templates into dated activities and has no standalone Employees menu.

Core3 implements this with separate YAML page/API contracts. The API provides
the employee wizard and company/department-eligible plan datasource, while
the page binds the permission-gated header action. Migration
`20260920180000-029` persists plan/responsible provenance. The atomic
mutation requires row version, company/actor scope, and active state; rejects
duplicate, ineligible, invalid-date, and empty-plan requests; and creates
deterministic ordered activity IDs/dates.

Focused coverage includes source mapping, plan selection, durable expansion,
stale/company/inactive/duplicate/invalid/empty guards, migration replay, and
file-backed restart. Authenticated Core3 desktop/mobile and paired Odoo
captures are under
`plan/odoo-ui-parity/evidence/employees/2026-09-20/EMP-LAUNCH-PLAN-001/`.
Evidence records the `Core3 Vietnam Branch` versus `Core3 Vietnam` fixture
name mismatch and narrow Odoo action visibility; this is bounded evidence,
not full Employees sign-off.

Status: ready

## EMP-ROUTE-CRUD-GATE-001: complete route/CRUD/actor/Odoo gate (2026-09-20)

The completed parameterized matrix covers all 28 registered Employees routes,
including seeded detail IDs and the generated Employee Analysis route. A clean
committed-HEAD runtime was used because the shared checkout contained an
uncommitted Timesheets page that failed global page-schema discovery; no other
module file was changed. Core3 authenticated desktop and mobile checks passed
with no page errors, failed requests, HTTP errors, blank settled states, or
horizontal overflow. The one mobile All activities sample required a 3.5s
settle retry and then rendered successfully.

The authenticated CRUD smoke created `EMP-GATE-001`, edited Job Title, archived
and restored the employee, and captured each persisted state without browser
errors. The actor matrix records Admin allowed on settings/detail/mutations,
Fleet denied settings and employee detail with HTTP 403, and unauthenticated
redirect to login. The paired Odoo `Employees` list and Abigail Peterson detail
were captured at 1440x1000 and 390x844 with no failed requests or page errors.

Evidence is under
`plan/odoo-ui-parity/evidence/employees/2026-09-20/EMP-ROUTE-CRUD-GATE-001/`.
No additional missing source-backed employee feature was exposed by the
settled matrix; the remaining module status is conditional until aggregate
parity review, not because this gate lacked runtime evidence.

## Reference gate

- Odoo addon/version: `hr`, Odoo 19 Community (`19.0-2` in the live
  environment).
- Source manifest: `/home/nhanjs/projects/odoo/addons/hr/__manifest__.py`.
- The addon is an application and depends on `base_setup`, `digest`,
  `phone_validation`, `resource_mail`, and `web`. It declares official demo
  data in `data/hr_demo.xml`.
- Authenticated live check on 2026-09-10 against `core3_reference` reports
  `ir.module.module(name=hr).state=installed` and `demo=true`, with 21
  Employees records visible. This is a module-state and rendered-record check,
  not an inference from an empty list.
- Reference URL: `http://localhost:8069`. Credentials remain outside this
  document's implementation contracts.

## Live routes and evidence

Odoo action paths explicitly declared by the source are `/odoo/employees`,
`/odoo/all_activities`, and `/odoo/departments`. Actions without a `path`
must be reached through their authenticated menu/action, not guessed from a
URL. The live audit loaded `/odoo/employees` at both requested viewports with
the installed `hr` addon and demo records.

Current authenticated reference captures, kept outside Git:

- Desktop, 1440x900: `/tmp/odoo-reference-employees-desktop.png`
- Mobile, 390x844 touch context: `/tmp/odoo-reference-employees-mobile.png`

These captures cover the populated Employees action only. Required future
captures for the remaining view modes, forms, configuration, departments, and
empty/archived states are listed below; absent files must not be invented:

- `/tmp/odoo-employees/employees-kanban-desktop.png` and
  `/tmp/odoo-employees/employees-kanban-mobile.png`
- `/tmp/odoo-employees/employees-list-desktop.png` and
  `/tmp/odoo-employees/employees-list-mobile.png`
- `/tmp/odoo-employees/employees-activity-desktop.png` and
  `/tmp/odoo-employees/employees-activity-mobile.png`
- `/tmp/odoo-employees/employees-graph-desktop.png` and
  `/tmp/odoo-employees/employees-graph-mobile.png`
- `/tmp/odoo-employees/employees-pivot-desktop.png` and
  `/tmp/odoo-employees/employees-pivot-mobile.png`
- `/tmp/odoo-employees/directory-kanban-desktop.png` and
  `/tmp/odoo-employees/directory-kanban-mobile.png`
- `/tmp/odoo-employees/employee-form-work-desktop.png` and
  `/tmp/odoo-employees/employee-form-work-mobile.png`
- `/tmp/odoo-employees/employee-form-personal-desktop.png` and
  `/tmp/odoo-employees/employee-form-personal-mobile.png`
- `/tmp/odoo-employees/employee-form-payroll-desktop.png` and
  `/tmp/odoo-employees/employee-form-payroll-mobile.png`
- `/tmp/odoo-employees/employee-form-settings-desktop.png` and
  `/tmp/odoo-employees/employee-form-settings-mobile.png`
- `/tmp/odoo-employees/departments-desktop.png` and
  `/tmp/odoo-employees/departments-mobile.png`
- `/tmp/odoo-employees/configuration-desktop.png` and
  `/tmp/odoo-employees/configuration-mobile.png`
- `/tmp/odoo-employees/empty-and-archived-desktop.png` and
  `/tmp/odoo-employees/empty-and-archived-mobile.png`

Capture through menu navigation, assert loaded title/action, visible records,
viewport fit, and no failed requests before saving. Use 1440x900 and
390x844 touch emulation.

## Visible menu, action, and view inventory

Visibility below follows `views/hr_views.xml`, `hr_employee_views.xml`,
`hr_employee_public_views.xml`, and the referenced configuration XML. The
ordinary `base.group_user` Directory is distinct from HR-officer Employees.

### Employees application

- Employees root (`menu_hr_root`), visible to `group_hr_manager`,
  `group_hr_user`, or `base.group_user`; includes the Employees application
  icon and Human Resources section.
- Human Resources / Employees (`menu_hr_employee_payroll`,
  `open_view_employee_list_my`), HR-user only; route `/odoo/employees`, model
  `hr.employee`, domain limited to allowed companies, context enables chat icon
  and defaults the company search panel.
- Human Resources / Directory (`menu_hr_employee`,
  `hr_employee_public_action`), ordinary-user directory; public employee
  fields only, with `kanban,list,form`.
- Human Resources / Reporting / Departments (`menu_hr_department_kanban`,
  `hr_department_kanban_action`), ordinary-user read access; route
  `/odoo/departments`, with `kanban,list,form`.
- Human Resources / Reporting is the parent for reporting entries supplied by
  extensions; the base `hr` source does not add a separate employee report
  action under it.

### Configuration (HR manager)

- Configuration / Employee / Onboarding / Offboarding
  (`mail_activity_plan_action`): `list,kanban,form`; launch-plan form wizard
  (`plan_wizard_action`) is opened from employee forms.
- Configuration / Employee / Work Locations (`hr_work_location_action`):
  `list,form`.
- Configuration / Employee / Working Schedules:
  `resource.action_resource_calendar_form`; external resource action, to be
  represented as a service-owned route or documented integration boundary.
- Configuration / Employee / Departure Reasons (`hr_departure_reason_action`):
  `list`.
- Configuration / Recruitment / Job Positions (`action_hr_job`): `list,form`,
  default filter `Current`; create-position form is `action_create_job_position`.
- Configuration / Recruitment / Contract Templates
  (`action_hr_contract_templates`): `list,form`, manager-only.
- Configuration / Settings (`hr_config_settings_action`): `form`, system
  administrator only, context selects module `hr`.
- Employee Tags (`open_view_categ_form`) and Contract Types are source-defined
  but `base.group_no_one` or inactive respectively; keep them out of the
  ordinary visible parity surface while retaining the deliberate hidden state.

### Employee actions and view modes

- `open_view_employee_list_my`: `kanban`, `list`, `form`, `activity`, `graph`,
  `pivot`; populated, filtered, grouped, archived, empty, and multi-edit
  states. List supports optional columns, avatar, presence, contract dates,
  wage, employee type, activities, department, job, manager, work location,
  related user, tags, country, and company.
- `open_view_employee_list`: `form,list`; generic form/list entry point used by
  integrations.
- `action_hr_employee_all_activities`: `activity,list,kanban,form,graph,pivot`,
  domain `activity_ids != False`, route `/odoo/all_activities`.
- `hr_employee_public_action`: `kanban,list,form`; directory-safe fields and
  no private/HR-only data.
- Employee form: avatar zoom/upload, presence/chat, Archived ribbon, History
  stat button, Create User (ERP manager), Launch Plan (HR user), version
  timeline, chatter, attachments, and tabs Work, Resume, Personal, Payroll,
  and Settings. Permission and active-state rules change visible fields and
  actions.
- Work: company, department, job position/title, manager, address, work
  location, departure reason/description/date, and HR note; includes
  organization-chart area.
- Resume: skills/resume editable regions.
- Personal: private contact/bank accounts, legal identity, birthday/privacy,
  emergency contact, visa/work permit, private address, home distance, family,
  education, and documents; HR-user only.
- Payroll: contract dates, wage, employee/contract/pay category, and working
  schedule; HR-manager only.
- Settings: linked user, timezone, HR responsible, attendance/POS PIN and
  barcode/badge actions; HR-user only.
- Graph: `New Employees Over Time`, line by contract start month; measures
  include employee id and optional distance/home, km, and children.
- Pivot: job rows, contract-start year columns, employee id and the same
  optional measures.
- Activity: avatar, employee, job, activity deadline, activity type/user,
  overdue/today/future and empty states.
- Departments: kanban/list/form, search, archive/unarchive, configuration,
  employee counts and related integration links.
- Supporting list/form states: work locations, departure reasons, job
  positions, contract templates, employment types, activity plans, settings, and all their
  create/edit/empty/permission states.
- Server actions/wizards: Load Sample Data on an empty Employees action; Create
  User confirmation and user creation; Launch Plan; version history/template
  load; bank-account allocation; Print Badge; archive/unarchive. Model these
  only where the action is visible in the corresponding permission state.

## Existing Core3 surface and parity gap

The `employees` service currently contains `manifest.yaml`, `storage.yaml`,
`permissions.yaml`, two migrations, `pages/employees.yaml`,
`pages/employee-detail.yaml`, `pages/employee-workflow.yaml`,
`pages/analysis.yaml`, and styles. It provides `/employees`,
`/employee-analysis`, a simplified employee list/create action, a four-state
  Draft -> Active -> On Leave -> Terminated workflow, and one demo employee.

The implementation batch must add the Odoo menu split and explicit route
aliases, public-directory projection, employee detail tabs, all-activities,
departments and manager configuration surfaces, Odoo fields/relations,
avatars/presence, optional columns, search panel, filters/group-by, kanban,
activity, graph, pivot, archive/restore, version/history, chatter,
attachments, plan/user/badge/wizard actions, multi-company access, and all
empty/denied states. It must also move the current page-local SQL into
convention-discovered `services/employees/api/` fragments keyed by `page.id`;
API fragments are not frontend `pages:` entries.

## Bounded batch: Work Locations

The next approved slice is complete on `agent/odoo-ui-employees-next` from
`8332456f`. It adds Odoo's `hr_work_location_action` as the service-owned
`/employees/work-locations` list and `/employees/work-locations/detail` form.
The list and detail layouts are separate from their API fragments and join by
`page.id`; the menu is under Employees / Configuration. Ordinary employees
can read the projection, while create, edit, archive, and restore actions
require `employees.manage`, matching Odoo's ordinary-user read and
`group_hr_manager` write boundary.

Migration `20260910160000-005-work-locations.yaml` seeds four active and one
archived stable locations, including Odoo's Building 1 demo location and
employee-count relations. The list contract covers search, active/archived
filtering, manager-only create, deterministic empty results, and an explicit
503 transport error state. The detail contract covers populated and not-found
results plus manager-only edit/archive/restore actions.

Authenticated Core3 captures are kept outside Git under
`/tmp/core3-odoo-employees/` for desktop and 390x844 touch list, detail,
create, and empty states. That earlier Work Locations note predates the
current owned reference refresh; the current `core3_owned` HR state and
Departure Reasons evidence are recorded in the bounded batch below.

## Shared primitives

Reuse and verify `ListView`/`DataGrid` with Odoo variant, avatar and status
cells, optional-column chooser, selection, pagination, row opening, search
panel and group grid; `KanbanView`, `Activity`, `CalendarView` where needed,
`GraphView`, and `PivotView`; `OdooFormView`, `OdooChatter`,
`OdooFollowerManager`, `OdooAttachmentPanel`, `StatusBar`, `StatusChip`,
`Image`, `AsyncSelect`, `DateInput`, `TextInput`, `TextareaInput`,
`CheckboxInput`, `ChoiceGroup`, `ActionButton`, `ConfirmDialog`, `Dialog`,
`PopupEditor`, `TabGroup`, `TreeView`, `TimelinePanel`, and `EmptyState`.
Use shared responsive layout, i18n, loading, error, access-denied, file-upload,
many2one/avatar, organization-chart, and server-form/action mutation
contracts. Record a generic contract first if version timeline, presence,
org-chart, skills resume, employee properties, or bank allocation is absent;
do not add an Employees-specific page renderer.

## Deterministic service-owned datasource/API/mock contract

Every visible page, view mode, modal, wizard, and empty/denied state must be
fed by a service-owned `services/employees/api/` datasource/action fragment.
Page YAML owns layout only. No page-local records, random IDs, `CURRENT_DATE`,
remote images, or browser-only fixtures. Use stable IDs and seeded date
`2026-01-15`; local image metadata or checked-in test fixtures may stand in for
avatars and documents.

The fixture set must cover:

- employees with ordinary-directory, HR-user, HR-manager, ERP-manager, and
  system-admin visibility; active, archived, newly hired, contract, departed,
  and no-activity records;
- departments with managers and employee counts; jobs with current and closed
  positions; work locations; departure reasons; contract types/templates;
- employee fields visible in each form tab, including private/contact,
  company, manager/coach, job, calendar, tags, user, payroll, barcode/POS,
  properties, resume/skills, bank accounts, attachments, followers, chatter,
  presence, activities, versions/history, and org relationships;
- enough records for search by name/email, department, manager, job, coach,
  tag, company, calendar, contract dates, archived, My Team, My Department,
  Newly Hired, In Contract, Out of Contract, activity filters, and every
  group-by (manager, department, job, employee type, birthday, start date,
  tags, properties);
- deterministic kanban/list/activity/graph/pivot results, populated and
  empty/filtered results, archived ribbon, no-avatar fallback, overdue/today/
  future activities, and mobile-safe long names/relations;
- explicit denied responses for directory/private fields, read, create,
  write, archive, HR-user, HR-manager, ERP-manager, multi-company, settings,
  and each wizard/server action; and
- idempotent foundation/demo migrations with stable ordering and fresh-install
  and upgrade checks. Do not copy official demo binaries into the product;
  keep fixture paths local and replaceable by real queries.

## Implementation route map

| Core3 route | Odoo counterpart | Required surface |
| --- | --- | --- |
| `/employees` | `/odoo/employees` | HR employee kanban/list/form/activity/graph/pivot |
| `/employees/directory` | Employees Directory action | public kanban/list/form projection |
| `/employees/activities` | `/odoo/all_activities` | activity-first employee action |
| `/employees/detail` | employee form | tabs, chatter, history, wizards, permission states |
| `/employees/departments` | `/odoo/departments` | department kanban/list/form |
| `/employees/jobs` | Job Positions action | current list/form and create form |
| `/employees/work-locations` | Work Locations action | list/form |
| `/employees/departure-reasons` | Departure Reasons action | list/empty/form boundary |
| `/employees/employment-types` | Employment Types action | editable list |
| `/employees/activity-plans` | Onboarding / Offboarding | list/kanban/form plus launch wizard |
| `/employees/contract-templates` | Contract Templates | manager list/form |
| `/employees/settings` | Settings action | HR settings form, system gate |
| `/employee-analysis` | employee graph/pivot | preserve existing alias; route to the employee action analysis modes |

Working Schedules, Employee Tags, Contract Types, and payroll/version detail
integrations must be explicit scoped routes or documented redirects with their
permission/inactive reason; they must not disappear silently.

## Bounded batch: Departure Reasons

This batch implements the next uncovered visible HR configuration action:
Departure Reasons. The current owned Odoo reference was re-authenticated on
2026-09-10 against database `core3_owned`; `ir.module.module` reports module
`hr` as `installed` with `demo=true`. The source-owned menu/action inventory is
`Employees > Configuration > Employee > Departure Reasons`, XML action
`hr_departure_reason_action`, model `hr.departure.reason`; the live Odoo route
resolved to `/odoo/action-414` and displayed the demo rows Fired, Resigned, and
Retired. Its list action has an inline New state rather than a separate form
view, so the Odoo `form` captures document that inline state.

Core3 owns the matching service/API/page contracts under page IDs
`employee-departure-reasons` and `employee-departure-reason-detail`. The list
and detail pages require `employees.manage`; all read/write datasource and
server-form actions use the same permission boundary, while pages remain
layout-only and bind to page-matched API fragments. Migration `006` uses the
Odoo default IDs and rows Fired, Resigned, and Retired; migration `009` repairs
older installs that already recorded the earlier synthetic fixtures. Both
preserve deterministic ordering and the explicit generated-id policy for
creates. Update mutations omit `timestamps:true` so fixture reads and
mutations share the deterministic contract.

Authenticated evidence, kept outside Git:

- Odoo: `/tmp/odoo-employees/departure-reasons-list-desktop.png`,
  `/tmp/odoo-employees/departure-reasons-form-desktop.png`,
  `/tmp/odoo-employees/departure-reasons-list-mobile.png`, and
  `/tmp/odoo-employees/departure-reasons-form-mobile.png`.
- Core3: `/tmp/core3-odoo-employees/departure-reasons-list-final-desktop-20260910.png`,
  `/tmp/core3-odoo-employees/departure-reasons-form-final-desktop-20260910.png`,
  `/tmp/core3-odoo-employees/departure-reasons-list-final-mobile-20260910.png`, and
  `/tmp/core3-odoo-employees/departure-reasons-form-final-mobile-20260910.png`.

The authenticated Playwright run used Odoo/Core3 viewports 1440x900 and
390x844, waited for `/api/modules` to expose both page IDs, asserted visible
Departure Reasons content, recorded zero failed HTTP responses, and found no
horizontal overflow. The Odoo mobile app launcher did not expose the same HR
anchor in its touch DOM, so that mobile evidence reuses the authenticated
`/odoo/action-414` resolved from the desktop menu. Core3 mobile uses the
authenticated `/employees/departure-reasons` route and opens its inline New
state to prove the responsive detail/edit boundary. The follow-up acceptance
run also verifies search, empty and missing detail responses, manager-only
CRUD, validation, stale-version, duplicate, and protected-default guards.

## Bounded batch: Reporting Departments

This batch hardens the installed Odoo 19 `hr_department_kanban_action` under
Employees > Reporting > Departments. The owned reference was authenticated as
`codex@core3.local` on 2026-09-10 at `/odoo/departments`; it displayed seven
demo departments in kanban and list states, with department forms exposing the
Employees and Plans stat buttons, manager, parent department, company, color,
and organization details.

Core3 keeps the existing `/employees/departments` route and its
`employee-departments` page ID, but now serves a deterministic service-owned
projection. Migration `007` adds the Odoo-facing relation counts, color,
visibility, and update-version fields, hides the legacy Engineering fixture
from this report without removing it from employee configuration, and seeds
the same seven department names and ordering. List and detail API fragments
remain separate from layout YAML and join by `page.id`; create, update,
archive, restore, delete, validation, duplicate, stale, missing-record, and
transport-error contracts are explicit and manager-gated. Deletion is guarded
to empty departments, matching Odoo's archive-first behavior for departments
that still have employees.

Final authenticated evidence, kept outside Git:

- Odoo: `/tmp/odoo-employees/departments-kanban-final-1440x900.png`,
  `/tmp/odoo-employees/departments-list-final-1440x900.png`,
  `/tmp/odoo-employees/department-form-final-1440x900.png`,
  `/tmp/odoo-employees/departments-kanban-final-390x844.png`, and
  `/tmp/odoo-employees/department-form-final-390x844.png`.
- Core3: `/tmp/core3-odoo-employees/departments-kanban-final-1440x900.png`,
  `/tmp/core3-odoo-employees/departments-list-final-1440x900.png`,
  `/tmp/core3-odoo-employees/department-form-final-1440x900.png`,
  `/tmp/core3-odoo-employees/departments-kanban-final-390x844.png`, and
  `/tmp/core3-odoo-employees/department-form-final-390x844.png`.

The focused Departments reporting test covers page/API ownership, seven
stable fixtures, search and empty states, detail/not-found and transport
errors, create/update/archive/restore, required-name validation, duplicate
names, optimistic stale writes, and the `employees.read` versus
`employees.manage` boundary.

## Bounded batch: Working Schedules

This batch implements the next uncovered visible Employees configuration
action after Work Locations: Employees > Configuration > Employee > Working
Schedules. The source action is `resource.action_resource_calendar_form` from
the installed Odoo Resource addon, linked by `hr.menu_resource_calendar_view`.
Odoo resolves the action to `/odoo/action-178` in `core3_owned`; its contract
is `resource.calendar`, `list,form`, five demo schedules, Archived and Partial
working schedules filters, Flexible and Company group-by filters, and a form
with schedule type, rate, company/timezone, hours, archive state, and inline
working-hour rows.

Core3 adds `/employees/working-schedules` and
`/employees/working-schedules/detail` under the Employees Configuration menu.
Pages are layout-only and join their service-owned API fragments by page ID.
The fixture migration `20260911150000-010-working-schedules.yaml` seeds the
five Odoo schedule names, stable rates, fixed/flexible values, the Standard 40
hours/week five-day working-time rows, and deterministic `2026-01-15` times.
Read/list/detail/working-hour datasources require `employees.read`; create,
edit, archive, restore, delete, and working-hour mutations require
`employees.manage`. Duplicate, required-value, invalid-hours, missing-record,
in-use, parent-stale, and line-stale guards are explicit.

Authenticated browser evidence, kept outside Git under `/tmp`:

- Odoo `/odoo/action-178`: `/tmp/odoo-employees-working-schedules-desktop-1440x900.png`, `/tmp/odoo-employees-working-schedule-detail-desktop-1440x900.png`, `/tmp/odoo-employees-working-schedules-mobile-390x844.png`, and `/tmp/odoo-employees-working-schedule-detail-mobile-390x844.png`.
- Core3 provisional DOM-smoke captures are in `/tmp/core3-employees-working-schedules-desktop-1440x900.png`, `/tmp/core3-employees-working-schedule-detail-desktop-1440x900.png`, `/tmp/core3-employees-working-schedules-mobile-390x844.png`, and `/tmp/core3-employees-working-schedule-detail-mobile-390x844.png`, but they are not valid visual evidence: the fresh worktree initially had no generated CSS, so these PNGs captured the unstyled launcher/loading state.

The shell Playwright fallback used `domcontentloaded` plus fixed waits, as the
persistent browser REPL was unavailable in this session. Odoo loaded the five
rows and Standard 40 form at both viewports with no non-static failed
responses. Core3 authenticated as `admin@tms.local` and the pre-CSS DOM smoke
loaded five rows and 15 working-hour rows at both viewports with no page errors
or horizontal overflow. A CSS-aware recapture was then blocked: after building
the standard global/auth/Employees CSS, the isolated dev supervisor repeatedly
dropped its backend listener and Vite returned 502 for `/api/modules`,
`/api/apps`, and page requests. Therefore Core3 styled visual QA remains an
explicit limitation and must be rerun against a stable restarted server; the
Odoo-auth credentials are not accepted by Core3, whose demo credentials were
used for the DOM smoke.

The focused `employees_working_schedules.integration.test.ts` suite passes 3
tests and 47 assertions; `bun run audit` passes with 415 pages, 421 routes,
and 726 datasources. Existing Employees action, Departments, Departure
Reasons, and Work Locations suites also pass.

## Bounded batch: Job Positions

This batch implements the next ordinary visible Employees configuration action
after Working Schedules and Departure Reasons: Employees > Configuration >
Recruitment > Job Positions. The live personal Odoo database `core3_personal`
was inspected on 2026-09-11. Menu id 309 resolves to `action_hr_job` (database
action 436), model `hr.job`, and view mode `list,form`; the action context
enables the `Current` filter. The installed `hr_recruitment` extension adds the
visible `Open Applications` list column and Company/Department search-panel
facets. The authenticated reference contained nine current demo positions.

Core3 adds `/employees/jobs` and `/employees/jobs/detail` under the Employees
Configuration menu. Layout pages are separate from service-owned API fragments
and join by page IDs `employee-job-positions` and
`employee-job-position-detail`. Migration
`20260911180000-011-job-positions.yaml` seeds nine deterministic positions,
stable counts, ordering, relations, and `2026-01-15` timestamps. The list
contract includes the Current/Archived boundary, name/department/company
search, empty and transport-error states, and the Odoo labels Job Position,
Department, Open Applications, and Target. The detail contract includes
Applications and Employees stat actions, Details/Summary/Trackers tabs,
permissioned HR-user create/edit/archive/restore actions, required-name and
non-negative-target validation, duplicate and missing guards, and optimistic
stale-write protection. Ordinary `employees.read` users can inspect the
projection; mutations require `employees.write`.

Focused validation and static evidence:

- `bun test test/employees_job_positions.integration.test.ts`: 3 tests,
  49 assertions passed.
- `bun run audit`: 443 pages, 450 routes, and 769 datasources passed.
- `git diff --check` passed before the implementation checkpoint
  `e1047537`.
- The implementation checkpoint contains only the Employees manifest, page/API
  YAML, migration, and focused test; screenshots are not tracked.

Authenticated visual evidence is kept outside Git. Odoo reference captures
used `core3_personal` and action 436 at 1440x900 and 390x844:

| State | Desktop | Mobile |
| --- | --- | --- |
| Odoo list | `/tmp/odoo-employees-job-positions-desktop-20260911.png` (`1b23959076d05793a400476b2b337ba272885a1ff73e05dde61d6636a1f9475b`) | `/tmp/odoo-employees-job-positions-mobile-20260911.png` (`de63c7b12f1bb05a269ed82a99f82212e0b4cb857004beb89f73261b48047642`) |
| Odoo form | `/tmp/odoo-employees-job-position-form-desktop-20260911.png` (`4a91adfed920f29518c506a1bced5e1690f9ae205fd69c21db03f76ddca55685`) | `/tmp/odoo-employees-job-position-form-mobile-20260911.png` (`dacce8d00fee191a845a68fc3926e013a7d65d2794c3922025fa8a5ca0d550b0`) |

Fresh authenticated Core3 captures used `admin@tms.local` on the isolated
runtime and the same two viewports:

| State | Desktop | Mobile |
| --- | --- | --- |
| Core3 list | `/tmp/core3-odoo-employees-job-positions-list-desktop-20260911-checkpoint.png` (`54009e56b231d988d06d574121fb871d5c14a0bb5735aafef75352eed1fb6b44`) | `/tmp/core3-odoo-employees-job-positions-list-mobile-20260911-checkpoint.png` (`e07e8153b5552a22e51e7b6ae58bd55d1ec23256535e7786e2fc0a11b55e6e9c`) |
| Core3 detail | `/tmp/core3-odoo-employees-job-position-detail-desktop-20260911-checkpoint.png` (`46beb6deaacf7ad3db88ef1054f97ea9fdeeaa7e733f9f2a5caebdc8c2c5568e`) | `/tmp/core3-odoo-employees-job-position-detail-mobile-20260911-checkpoint.png` (`0539569a7e72779e2d6f5abb7a5539ce6207e4d60473890b12f837b3850dce99`) |

The browser matrix loaded the Job Positions title, all nine deterministic
rows, Open Applications, Chief Technical Officer, Hiring Process, Job Posting,
and Details/Summary/Trackers at both viewports. It recorded no failed
application responses, no page errors, and no horizontal overflow. Known
bounded differences remain: Core3 uses the Fluent shell instead of Odoo's
purple shell, its generic list renderer presents filters as a top chip instead
of Odoo's left search panel, and the shared `OdooFormView` renders the
permissioned edit-field summary before the notebook, so the detail fields are
repeated in the Details tab. Odoo's native recruitment many2many skills,
chatter, relational editors, and application/employee drill-down surfaces are
represented by deterministic display fields and permissioned navigation
actions in this slice; they remain follow-up parity work.

## Bounded batch: Contract Templates

This batch implements the next uncovered installed Employees configuration
action after Job Positions: Employees > Configuration > Recruitment > Contract
Templates. The live personal Odoo database `core3_personal` was inspected on
2026-09-11. Menu id 310 resolves to `action_hr_contract_templates` (database
action 432), model `hr.version`, and view mode `list,form`; the action domain
limits records to templates with no employee assignment. The authenticated
reference contains the two demo templates Developer USA and HR Manager.

Core3 adds `/employees/contract-templates` and
`/employees/contract-templates/detail` under the Employees Configuration menu.
The layout pages are separate from service-owned API fragments and join by
page IDs `employee-contract-templates` and
`employee-contract-template-detail`. Migration
`20260911193000-012-contract-templates.yaml` seeds the two Odoo-facing
templates with stable job, department, HR responsible, wage, contract type,
pay category, working schedule, company, and effective-date fields. The
list contract mirrors Odoo's template columns and Current/Archived boundary;
the detail contract provides the Contract Template and Salary Information
sections with manager-only edit, archive, restore, and delete actions.

All reads and mutations require `employees.manage`, matching Odoo's
`group_hr_manager` visibility and `hr.version` manager access. Required-name,
non-negative-wage, duplicate-name, missing-record, optimistic stale-write,
archive/restore, and delete guards are explicit. The source query keeps
employee-linked versions out of the template projection.

Focused validation and static evidence:

- `bun test test/employees_contract_templates.integration.test.ts`: 3 tests,
  50 assertions passed.
- `bun run audit`: 454 pages, 461 routes, and 789 datasources passed.
- `git diff --check` passed before implementation commit `55768aa8`.
- The implementation checkpoint contains only the Employees manifest,
  page/API YAML, deterministic migration, and focused test; screenshots are
  not tracked.

Authenticated visual evidence is kept outside Git. Odoo action 432 and Core3
were captured with authenticated sessions at 1440x900 and 390x844, then
visually inspected. Both surfaces showed the two seeded templates and the
Developer USA detail. The final Core3 run recorded no failed requests, no page
errors, and no horizontal overflow; Core3's Fluent shell and top filter chip
remain the known bounded differences from Odoo's purple shell and left search
panel.

| State | Odoo desktop | Odoo mobile |
| --- | --- | --- |
| Contract Templates list | `/tmp/odoo-employees-contract-templates-list-desktop-1440x900.png` (`450dbab0e46b448e7c2b9cccf0a41985baf6732e1fcfdaa4e2e1c3047ae36997`) | `/tmp/odoo-employees-contract-templates-list-mobile-390x844.png` (`9cbdb5ae5593957a1cf01388dfe284db81cbc17b994d78f7162acd64cf52fe14`) |
| Contract Template detail | `/tmp/odoo-employees-contract-template-detail-desktop-1440x900.png` (`ff6192488c3fca20a4502ad47efca37f3f066e9238fcd709cd4ff8a45645e056`) | `/tmp/odoo-employees-contract-template-detail-mobile-390x844.png` (`913afe0847b61c483ca45163c1bb0321b4949bc7545941299554697f71556956`) |

| State | Core3 desktop | Core3 mobile |
| --- | --- | --- |
| Contract Templates list | `/tmp/core3-employees-contract-templates-list-desktop-1440x900.png` (`ff95c3233371878820ca7369394ade5ab998b3b5273b05878017a96414970e9c`) | `/tmp/core3-employees-contract-templates-list-mobile-390x844.png` (`f67b6ad3c30fb88d091b91d03ca6527f83107af9d399ffc8d24dc9fa4a95db86`) |
| Contract Template detail | `/tmp/core3-employees-contract-template-detail-desktop-1440x900.png` (`f8b34ddf655d48dde257d179e24e8d04cea3078c22cf14d11245e8585823ccca`) | `/tmp/core3-employees-contract-template-detail-mobile-390x844.png` (`86f7e7e610b821540657810abeeb960bc69159447b625650d83634727b829d4c`) |

## Bounded batch: Employment Types

This batch implements the next uncovered visible Employees configuration action
after Job Positions and Contract Templates: Employees > Configuration >
Recruitment > Employment Types. The live personal Odoo database
`core3_personal` was inspected on 2026-09-11. The menu entry
`hr.menu_view_hr_contract_type` resolves to database action 434,
`hr_contract_type_action`, model `hr.contract.type`, and a list-only action.
The authenticated live screen contains the twelve demo rows Permanent,
Temporary, Interim, Seasonal, Full-Time, Part-Time, Intern, Student,
Apprenticeship, Thesis, Statutory, and Employee.

The source XML records this menu as `active="0"`, while the installed personal
database visibly exposes it under Employees > Configuration > Recruitment. The
source list is `editable="bottom"` with a sequence handle, Name, hidden code,
and optional Country columns. `ir.model.access.csv` grants the HR-user group
read, write, create, and delete access (`1,1,1,1`), so this slice keeps the
page visible to `employees.read` and gates inline create, update, and delete
mutations on `employees.write`. There is no archive state in the Odoo model.

Core3 adds `/employees/employment-types` with page/API ownership joined by
`employee-employment-types`, the Employment Types item under Employees /
Configuration / Recruitment, and migration
`20260911200000-013-employment-types.yaml`. The migration is idempotent and
seeds stable IDs and Odoo sequence values 1001 through 1012. The list mirrors
the editable-bottom action, supports search and empty/transport states, and
keeps the optional Country projection available without inventing data.

Focused validation and static evidence:

- `bun test test/employees_employment_types.integration.test.ts`: 3 tests,
  35 assertions passed.
- `bun run audit`: 460 pages, 467 routes, and 800 datasources passed.
- `git diff --check` passed before implementation commit `b68d273f`.
- The implementation checkpoint contains only the Employees manifest, page/API
  YAML, deterministic migration, and focused test; screenshots are not tracked.
- Guards cover required and duplicate names, optimistic stale writes, missing
  records, delete, idempotent migration, search, empty, and transport states.

Authenticated visual evidence is kept outside Git. Odoo action 434 and Core3
were captured and inspected at 1440x900 and 390x844 with the authenticated
Odoo user `codex@core3.local` and Core3 admin `admin@tms.local`. The final
matrix recorded no failed requests, page errors, or horizontal overflow. Core3
uses the shared Fluent shell and route breadcrumb/search treatment instead of
Odoo's purple shell and centered search panel; the Employment Types list,
editable-bottom row, seeded order, and responsive controls are otherwise
represented in the paired states below.

| State | Odoo desktop | Odoo mobile |
| --- | --- | --- |
| Employment Types list | `/tmp/odoo-employees-employment-types-list-desktop-1440x900.png` (`68b54c0e6d08b0736abd3dc0eb353d592080ea986e3c9224b33fb5369909712e`) | `/tmp/odoo-employees-employment-types-list-mobile-390x844.png` (`46be1298a894587ecb15d2b676deac326288688c33ab121d01167c46f40774dc`) |
| Employment Types inline New | `/tmp/odoo-employees-employment-types-inline-desktop-1440x900.png` (`13e490eb556e7c25a6d9c879a984c734e33e12d409a5109b096fcf29263841eb`) | `/tmp/odoo-employees-employment-types-inline-mobile-390x844.png` (`3556e3dc9f8e929817031e20172fbbb9f84c05eda13f1c0fa638e0bef41d7e78`) |

| State | Core3 desktop | Core3 mobile |
| --- | --- | --- |
| Employment Types list | `/tmp/core3-odoo-employees-employment-types-list-desktop-1440x900.png` (`23baa35ba9abe75e806d2978706862412080c552815fe42f13dff26ced6b8298`) | `/tmp/core3-odoo-employees-employment-types-list-mobile-390x844.png` (`b50fb8791f2470a83516c8730d6450bba94e2ea5c9ce6b1c8bd5b5169743efcd`) |
| Employment Types inline New | `/tmp/core3-odoo-employees-employment-types-inline-desktop-1440x900.png` (`49c8f34409e1b2bdc86a339ae2c087e6c4da33e7486279824533297ad4a6b681`) | `/tmp/core3-odoo-employees-employment-types-inline-mobile-390x844.png` (`0b9adbd13f1c915f24352e198977ea1a4f6d98e135e5393269edb08e3bf0ffde`) |

## Bounded batch: All activities

This batch hardens the next genuinely uncovered Employees action: Employees
Reporting / All activities. The live Odoo 19 user database was inspected on
2026-09-11. The source action `action_hr_employee_all_activities` resolves to
database action 404 and route `/odoo/all_activities`; it uses model
`hr.employee`, the domain `activity_ids != False` within the allowed company
set, and view order `activity,list,kanban,form,graph,pivot`. Its activity list
view shows employee, activity deadline/type/user, department, job, optional
contact/contract/pay fields, and supports multi-edit; opening a row enters the
employee form rather than an activity CRUD form. The live database contains 24
employees, of which three have three employee activities, so the reference
action is a populated read/report surface rather than an activity creation
screen.

Core3 already has the initial `employee-activities` page/API scaffold. This
bounded slice makes it an accepted, independently tested action: the page
remains layout-only and binds to `api/activities.yaml` by `page.id`, while the
service-owned datasource projects stable activity-bearing employee rows and
the existing activity/card/kanban/graph/pivot modes. Reads require
`employees.read`; the action intentionally has no create/update/archive/delete
mutation because the Odoo action exposes employee navigation and report
views, not activity CRUD. Empty, transport-error, missing employee, search,
timing/type filters, deterministic ordering, and employee-row navigation are
explicit contracts, with stable `2026-01-15` fixture dates and no remote
assets.

Authenticated evidence is kept outside Git and must be captured afresh for
this batch:

- Odoo action 404: `/tmp/odoo-employees-all-activities-desktop-1440x900.png`
  and `/tmp/odoo-employees-all-activities-mobile-390x844.png`.
- Core3: `/tmp/core3-employees-all-activities-desktop-1440x900.png` and
  `/tmp/core3-employees-all-activities-mobile-390x844.png`.

The browser matrix must use authenticated sessions at 1440x900 and 390x844,
assert the action title and visible activity-bearing employees, exercise
search/filter/navigation plus empty and transport-error states, record zero
application failures/page errors, and prove exact viewport fit. Known bounded
differences may include Core3's Fluent shell and its service-owned activity
row projection versus Odoo's native employee list/activity widgets.

## Bounded batch: Reporting Departments

This batch hardens the installed Odoo 19 `hr_department_kanban_action` under
Employees > Reporting > Departments. The owned reference was authenticated as
`codex@core3.local` on 2026-09-10 at `/odoo/departments`; it displayed seven
demo departments in kanban and list states, with department forms exposing the
Employees and Plans stat buttons, manager, parent department, company, color,
and organization details.

Core3 keeps the existing `/employees/departments` route and its
`employee-departments` page ID, but now serves a deterministic service-owned
projection. Migration `007` adds the Odoo-facing relation counts, color,
visibility, and update-version fields, hides the legacy Engineering fixture
from this report without removing it from employee configuration, and seeds
the same seven department names and ordering. List and detail API fragments
remain separate from layout YAML and join by `page.id`; create, update,
archive, restore, delete, validation, duplicate, stale, missing-record, and
transport-error contracts are explicit and manager-gated. Deletion is guarded
to empty departments, matching Odoo's archive-first behavior for departments
that still have employees.

Final authenticated evidence, kept outside Git:

- Odoo: `/tmp/odoo-employees/departments-kanban-final-1440x900.png`,
  `/tmp/odoo-employees/departments-list-final-1440x900.png`,
  `/tmp/odoo-employees/department-form-final-1440x900.png`,
  `/tmp/odoo-employees/departments-kanban-final-390x844.png`, and
  `/tmp/odoo-employees/department-form-final-390x844.png`.
- Core3: `/tmp/core3-odoo-employees/departments-kanban-final-1440x900.png`,
  `/tmp/core3-odoo-employees/departments-list-final-1440x900.png`,
  `/tmp/core3-odoo-employees/department-form-final-1440x900.png`,
  `/tmp/core3-odoo-employees/departments-kanban-final-390x844.png`, and
  `/tmp/core3-odoo-employees/department-form-final-390x844.png`.

The focused Departments reporting test covers page/API ownership, seven
stable fixtures, search and empty states, detail/not-found and transport
errors, create/update/archive/restore, required-name validation, duplicate
names, optimistic stale writes, and the `employees.read` versus
`employees.manage` boundary.

## Acceptance

- Source and manifest checks identify `hr`, version, dependencies, official
  `hr_demo.xml`, and live `core3_owned` status `installed`/`demo=true`. The
  gate never treats Discuss fallback screenshots as Employees reference
  evidence.
- Inventory checks map every visible menu/action/view above, including group
  boundaries, source routes, launch/create/archive/wizard actions, and hidden
  technical/inactive entries.
- Authenticated browser checks navigate from the Odoo Employees menu in an
  installed disposable demo database at 1440x900 and 390x844, capture each
  listed state, and assert title, action, records, no failed requests, no
  horizontal overflow, and usable mobile controls. The Departure Reasons
  batch satisfies the installed action and its four Odoo captures.
- Core3 checks navigate through People/Employees or the authenticated resolved
  route and
  cover populated, empty, filtered, archived, denied, list, kanban, form,
  activity, graph, pivot, directory, department, configuration, wizard,
  chatter, attachment, and mobile states.
- Search/filter/group checks cover every named source filter, search-panel
  facet, optional column, bulk/multi-edit, pagination, row opening, relation
  selection, company boundary, and activity deadline state.
- Form checks cover all tabs, read/write rules, required name, image fallback,
  status/archive ribbon, user/plan/history/badge/bank actions, chatter,
  attachments, version and org-chart states, plus denied manager/payroll/
  private/settings fields.
- Datasource checks prove API-fragment ownership, stable IDs/order/seeded dates,
  no page-local fixtures or remote assets, explicit denied/empty responses,
  and idempotent fresh-install/upgrade migrations.
- Run YAML/schema validation, `bun run audit`, focused employee route/API/
  permission checks, authenticated Playwright checks where the reference is
  installed, `git diff --check`, and verify the commit contains only this
  sub-plan.

## Bounded batch: Employees Settings

This batch implements the one remaining ordinary Employees configuration action
proven missing from Core3: Employees > Configuration > Settings. In the fresh
`core3_codex_demo` database, authenticated as `codex@core3.local`, menu id 312
resolves to `hr.hr_menu_configuration` and action id 449
(`hr_config_settings_action`), model `res.config.settings`, form-only. The
source XML confirms the menu is system-administrator-only and the form covers
Employees, Work Organization, and Contract settings: presence controls, Skills
Management, Company Working Hours, and contract/work-permit expiration notice
periods. The live Employees menu also exposed the already-covered Work
Locations, Working Schedules, Departure Reasons, Job Positions, Contract
Templates, and Employment Types entries; this batch does not redo them or
expand into Activity Plans, Skill Types, Badges, Challenges, or Goals History.

Core3 adds `/employees/settings` with page id `employee-settings`; the page is
layout-only and binds to `api/settings.yaml` through the same page id. Migration
`20260911203000-014-settings.yaml` seeds one stable company settings record with
fixed `2026-01-15` timestamps. The `employees.settings` permission is required
by the page, datasource, save action, and manifest menu, matching Odoo's
`base.group_system` menu boundary. The update mutation uses optimistic
concurrency and explicit missing, stale, invalid-value, empty, and transport
contracts.

The first visual Core3 probe exposed a real shared-runtime defect: `SettingsView`
had no imported `.o-settings-*` stylesheet, so the page fell back to browser
default controls and fonts, especially on mobile. Shared responsive styling was
added in `packages/client/src/styles/components/settings.scss`, imported from
`components.scss`, and the global/Employees CSS bundles were rebuilt. The
corrected captures below were visually inspected and show the styled settings
cards, responsive single-column mobile layout, visible Employees tab, and
populated controls.

Focused and static validation:

- `bun test test/employees_settings.integration.test.ts`: 3 tests, 22
  assertions passed.
- `bun run audit`: 499 pages, 506 routes, and 880 datasources passed.
- `bun run lint` passed.
- `bun run css:build:global && bun run css:build:employees` passed.
- `git diff --check` passed.
- Implementation commits: `c8561008` (Employees Settings contracts) and
  `0c60cac1` (shared responsive SettingsView styling). Evidence is not tracked.

Authenticated browser evidence is kept outside Git. Odoo was authenticated as
`codex@core3.local` in `core3_codex_demo`; desktop navigation used Home Menu >
Employees > Configuration > Settings, while the mobile capture used the
authenticated resolved action URL `/odoo/action-449`. Core3 was authenticated
as `admin@tms.local` and loaded the explicit `/employees/settings` route on the
isolated runtime. Both surfaces were checked at 1440x900 and 390x844; each
asserted the Settings title/route, populated presence/schedule/contract text,
zero `requestfailed` entries, zero `pageerror` entries, and exact body/document
widths equal to the viewport.

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Odoo Settings | `/tmp/odoo-employees-settings-desktop-20260911.png` (`c75a177ebb48a96da2e894cd6f8ebee22e92417352af6362efa09c3b443d5d4c`) | `/tmp/odoo-employees-settings-mobile-20260911.png` (`5d701f1cde51b44ec85e6fb0701fcd1a9f146ee229d102fb43b248c01bf40e8d`) |
| Core3 Settings | `/tmp/core3-employees-settings-desktop-20260911.png` (`2c46e07e2e594c674eaf1bb0ab189437285f3bde31a7da1bdc4647f4bf3b2518`) | `/tmp/core3-employees-settings-mobile-20260911.png` (`1946663c770b0918b47267ee308f62c7a58e6c9ef3d476b3d02ea3e17c93fbd6`) |

Known differences are bounded to the shared Fluent shell versus Odoo's purple
shell, Core3's card-based responsive settings renderer versus Odoo's native
settings blocks, and deterministic service-owned settings storage versus
Odoo's transient `res.config.settings` persistence. No Discuss fallback image
is used as evidence.

## Bounded batch: All activities (2026-09-11)

The active Odoo 19 Employees action `action_hr_employee_all_activities` is the
Reporting > All activities surface with `activity,list,kanban,form,graph,pivot`
views and the `activity_ids != False` domain. Core3 keeps the existing
`/employees/activities` route, preserves visible List, Kanban, Activity,
Graph, and Pivot tabs, and uses the service-owned `employee_activities`
datasource. The list now projects one row per active employee with activities,
activity count, next deadline, department, and job; the responsive Kanban
state exposes work contact and activity summary fields.

The page remains layout-only and joins `api/activities.yaml` by
`page.id: employee-activities`. Migration `20260911220000-015` adds the
idempotent projection index and normalizes row versions. The action is
read-only under `employees.read`; search, timing/type filters, empty results,
transport errors, active-employee scope, and employee-row navigation are
covered by `test/employees_all_activities.integration.test.ts` (3 tests, 23
assertions). The follow-up guard fix ensures inactive employees are excluded
from the action projection.

Authenticated Core3 browser verification used `admin@tms.local` at 1440x900
and 390x844 through the current runtime. Both states rendered the three
activity-bearing employees with exact body/document viewport widths and no
page errors, failed requests, or HTTP error responses. Odoo reference captures
were taken at the same viewports; screenshots stay under `/tmp`:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo All activities | 1440x900 | `/tmp/odoo-employees-all-activities-desktop-1440x900.png` | `9af62c94040873f2c067504ccc16d7438fc4f560916a2f91a1e578caa600378a` |
| Odoo All activities | 390x844 | `/tmp/odoo-employees-all-activities-mobile-390x844.png` | `5e9452fe6de9b0193fb3967275b0804d8aa1893b63f4e65619f07fe8e87ba7d2` |
| Core3 All activities | 1440x900 | `/tmp/core3-employees-all-activities-current-1440x900.png` | `93456d5e84bb98059fb1daf2ebd4a4e4e0fb7eaa8cad725a4e5da9ff982ab1f5` |
| Core3 All activities | 390x844 | `/tmp/core3-employees-all-activities-current-390x844.png` | `7596401e975744305c9f22be42622504fa375c6fbcaf418e91d04688512101af` |

The bounded visual residual is the Core3 Fluent shell and responsive employee
cards versus Odoo's purple shell/activity matrix. Images are not committed.

## Activity Plans bounded slice (2026-09-12)

Core3 adds the Employees onboarding/offboarding Activity Plans action at `/employees/activity-plans`, with List/Kanban and detail pages, inline activity steps, page/API YAML joined by `page.id`, deterministic plans, and manager-only CRUD/archive/restore/delete guards. The focused test passes 3 tests and 39 assertions.

Odoo reference captures cover list/detail at 1440x900 and 390x844 under `/tmp/core3-odoo-parity/employees-next-20260912/`; Core3 captures cover the desktop list/detail states. The mobile Core3 runtime capture could not be completed before the isolated browser process was stopped, so mobile visual parity remains unclaimed. Images remain outside Git.

## Bounded batch: Employees Directory (2026-09-12)

This batch implements the next uncovered Employees action beyond the already
completed departments, departure reasons, settings, activities, plans,
schedules, jobs, and employment types slices: Human Resources > Directory.
The source action is `hr_employee_public_action` from Odoo 19 `hr`, model
`hr.employee.public`, with view order `kanban,list,form`, allowed-company
scoping, and `base.group_user` read-only access (`1,0,0,0`). Its source search
contract includes Employees/name and work-email search, Company and Department
facets, Manager/Job fields, My Team, My Department, Newly Hired, Archived, and
Manager/Department/Job/Company group-by options. The public form disables
create/write and exposes only work identity, contact, company, department, job,
manager, and work-location information.

Core3 keeps `/employees/directory` and `/employees/directory/detail`, joined by
page IDs `employee-directory` and `employee-directory-detail`. The page YAML
is presentation-only; `api/directory.yaml` and `api/directory-detail.yaml` own
the read-only projection and navigation action. Migration
`20260912093000-017-directory-projection.yaml` adds an idempotent
`directory_visible` projection boundary and deterministic index without
changing existing employee fixture IDs or the seeded `2026-01-15` date. Active,
archived, filtered, empty, forbidden, transport-error, and not-found contracts
are explicit; no CRUD mutation is exposed because Odoo's public action is
read-only. Public queries omit private payroll, identity, and internal row
version fields.

Live audit limitation: the one shell-Playwright fallback reached Odoo's
database selector at `http://127.0.0.1:8069` and confirmed only
`core3_reference` was exposed, but `codex@core3.local` /
`Core3Odoo2026!` was rejected with `Wrong login/password`. No authenticated
live Directory screenshot or rendered-record assertion is claimed. The
action/view/permission contract is backed by the local Odoo source files
`addons/hr/views/hr_employee_public_views.xml` and
`addons/hr/security/ir.model.access.csv`; retry authenticated comparison when
the reference credentials/database are restored.

The required paired screenshots were attempted once under
`/tmp/core3-odoo-parity/employees-batch3-20260912/` at 1440x900 and 390x844.
The persistent browser REPL was unavailable, so shell Playwright was the one
runtime fallback; screenshots remain outside Git. Missing captures are an
explicit runtime limitation, not invented evidence.

## Training Attendances bounded action (2026-09-12)

Local `hr_skills` source inspection identified Learning > Training Attendances
on `hr.resume.line`, with list, kanban, form, and calendar views. Core3 adds
`/employees/training-attendances` with a page/API pair joined by `page.id`,
deterministic course fixtures, and read access plus HR-user CRUD guards. The
focused contract covers search, facets, empty/transport states, validation,
stale rows, missing rows, and permission boundaries.

The focused test passes 3 tests and 30 assertions. Capture was attempted under
`/tmp/core3-odoo-parity/employees-batch4-20260912/`; Vite failed with
`EMFILE: too many open files`, and the built-frontend fallback lacked the event
mediator. No rendered parity claim or screenshot is made; images remain outside
Git.

## Employee Records bounded action (2026-09-12)

The next uncovered core `hr` action after the existing Employees integrations is
`action_hr_version` (`Employee Records`, `/odoo/versions`) from
`views/hr_version_views.xml`. It is scoped to employee-linked `hr.version`
rows and exposes `list,graph,pivot`, with Effective Date descending order,
contract dates, employee, note, wage, contract type, job, department, schedule,
company, and audit metadata. Running, Expired, Future, Archived, and
Employee/Job/Department/Working Schedule grouping filters come from the source
search view; contract dates and wage remain HR-manager fields. Core3 adds the
read-only `/employees/versions` route, joined by `page.id: employee-versions`
to `api/versions.yaml`, with stable employee relations and fixed
`2026-01-15` fixture evaluation.

Migration `20260912103000-019-employee-records.yaml` is idempotent and seeds
current, future, expired, and archived records without page-local fixtures.
Read access follows the Odoo HR-user `hr.version` access row; no CRUD action is
exposed because the source list disables create. Focused tests cover source
mapping, page/API ownership, deterministic ordering, relation projection,
future/empty/transport states, and idempotent migration.

Authenticated capture was attempted under
`/tmp/core3-odoo-parity/employees-batch5-20260912/`, but the persistent
`playwright-interactive` runtime is unavailable in this session. No
authenticated Odoo/Core3 render or visual parity claim is made; screenshots
remain outside Git.

## Skill Types bounded action (2026-09-12)

The next uncovered Employees action after Employee Records is the `hr_skills`
action `hr_skill_type_action`, reached at Employees > Configuration > Employee
> Skill Types. The source action is `hr.skill.type` with `list,form` modes and
the HR-user menu/access boundary (`hr_skill_type_action`, `hr_skill_type_menu`,
`access_hr_skill_type`). The list preserves Odoo's sequence handle, Skill
Types, color, Skills, and Levels columns. The form preserves the Skill Type,
color, Certification, Archived ribbon, and relation-backed Skills and Levels
sections. Archived filtering and certification display are explicit.

Core3 adds `/employees/skill-types` and `/employees/skill-types/detail`, with
page-only YAML joined to `api/skill-types.yaml` and
`api/skill-type-detail.yaml` by matching page IDs. Migration
`20260912110000-020-skill-types.yaml` is idempotent, uses fixed
`2026-01-15` timestamps, and seeds technical, language, soft-skill,
certification, and archived types with stable Skills/Levels relations. Reads
use `employees.read`; create, edit, archive, and restore use
`employees.write`. Focused tests cover source mapping, deterministic ordering,
relations, current/archived/empty/transport states, validation, stale-action
contract, and permission boundaries.

Authenticated Odoo/Core3 browser verification and 1440x900 / 390x844 captures
were not completed: the required persistent `playwright-interactive` `js_repl`
runtime is unavailable in this session, and no alternate authenticated browser
runtime was available. No visual-parity claim is made and no screenshots are
invented; the required artifact directory remains reserved at
`/tmp/core3-odoo-parity/employees-batch6-20260912/`.

## Certifications bounded action (2026-09-12)

This batch implements the next uncovered installed Employees/Learning action
after Skill Types: `Employees > Learning > Certifications`. The Odoo source
trace is `/home/nhanjs/projects/odoo/addons/hr_skills/views/hr_views.xml`:
`action_hr_employee_skill_certification` (lines 584-594) is named
Certifications, uses model `hr.employee.skill`, has the explicit
`is_certification=True` domain, context `show_employee=True` plus default
grouping by type, and `list,form` views. The menu is
`hr_certification_menu` under `hr_skill_learning_menu` (lines 610-622), whose
parent Learning menu is HR-user-only. The list source is the certification
list at `hr_views.xml` lines 540-582: New, Employee, Certification, optional
Level/Type, From/To validity dates, and validity decorations. Search supports
Certification/Employee, Valid certification, and grouping by Certification,
Type, and Employee. The form is the certification-specific inherited form at
lines 400-444. ACL lines 12-13 of
`/home/nhanjs/projects/odoo/addons/hr_skills/security/ir.model.access.csv`
grant HR users full CRUD and ordinary users read/write/create without unlink;
Core3 keeps the visible route read-gated and reserves mutations for
`employees.write`, with delete explicitly write-gated as the service boundary.

Core3 adds `/employees/certifications` and
`/employees/certifications/detail`, with layout-only pages joined to
`api/certifications.yaml` and `api/certification-detail.yaml` by page IDs.
Migration `20260912120000-021-certifications.yaml` seeds four stable employee
certifications, including valid, expiring, expired, and archived-employee
states, and evaluates validity against fixed `2026-01-15` data. The list
preserves Odoo's List/Kanban action surface, validity filter, three group-by
facets, employee/certification/date columns, row navigation, New, and empty
and 503 transport states. The detail contract covers populated/not-found
records, create/update/delete, required values, reversed date validation,
duplicate ranges, and optimistic stale writes.

Focused evidence:

- `bun test test/employees_certifications.integration.test.ts`: 3 tests, 25
  assertions passed.
- `bun run audit`: 610 pages, 618 routes, and 1049 datasources passed.
- `bun run lint` from `sdk/bun` passed; `git diff --check` passed.

Authenticated Core3 and Odoo captures were attempted under
`/tmp/core3-odoo-parity/employees-batch7-20260912/` for 1440x900 and 390x844.
No visual-parity claim is made: this session has no persistent
`playwright-interactive` `js_repl`, the Playwright package is unavailable, and
the Core3 listener at `127.0.0.1:3003` was not running (`curl` returned
connection refused). Odoo at `127.0.0.1:8069` returned the unauthenticated
database/login page (HTTP 200), but no authenticated certification render was
available. No screenshots were invented or committed.

## Employee Work tab bounded view (2026-09-12)

The next uncovered view state after Certifications is the Work tab of the
`hr.employee` form from `addons/hr/views/hr_employee_views.xml`. Odoo orders
Company, Department, Job Position, Job Title, Manager, Address, Work Location,
an inactive-only Departure section (reason, description, date), an HR-user Note,
and the organization-chart area. The form header remains HR-user-only for
Launch Plan and version history, while authenticated readers can open the Work
projection; writes use the existing HR-user `employees.write` boundary. Active
and archived/departed states use stable `2026-01-15` fixtures and no page-local
data.

Core3 extends the existing `employee-detail` page/API join with the bounded Work
projection and migration `20260912123000-022-employee-work-tab.yaml`. The
focused test is `test/employees_employee_work_tab.integration.test.ts`; it
covers page/API ownership, Odoo field ordering, deterministic active/departed
records, and the read/write boundary. This slice does not claim the Odoo
organization-chart interaction or authenticated visual parity: the required
persistent browser runtime is unavailable in this session, and no alternate
authenticated browser runtime was available. Capture attempts are reserved
under `/tmp/core3-odoo-parity/employees-batch8-20260912/`; no screenshots are
invented or committed.

## Employee Work tab visual audit follow-up (2026-09-12)

The bounded source audit found that the prior Core3 contract duplicated a
Work Information block above the notebook, merged Odoo's Work and Location
groups, and rendered the organization-chart projection as ordinary fields.
Odoo's `hr_employee_views.xml` orders the sections as Work (company,
department, job position, job title, manager), Location (address, work
location), inactive-only Departure, and HR-user Note, with the organization
chart in a separate adjacent area. Core3 now preserves that order and records
the chart field mapping without presenting it as ordinary form fields.

An authenticated browser audit was attempted at 1440x900 and 390x844 against
the isolated worktree. The dev runner failed before readiness with Vite
`EMFILE: too many open files` while watching `vite.config.ts`. A built-server
fallback returned 401 JSON for direct employee navigation and then stopped on
a port collision. No authenticated Core3 or Odoo Work-tab render was
available; no visual-parity claim or screenshot is made.
 
The isolated follow-up also repaired the missing ActivityView import-map entry
and made conditional Odoo form groups honor `show_if`; the focused client test
passes. The generated Core3 Work-tab captures are under
`/tmp/core3-odoo-parity/employees-visual4-20260912/`. The Odoo files in that
directory were not authenticated during the temporary reference throttle, so
they are not treated as parity evidence.

## Register Departure wizard bounded workflow (2026-09-20)

The next source-backed employee workflow beyond direct archive/restore and
departure-reason CRUD is Odoo's `hr.departure.wizard`, defined in
`addons/hr/wizard/hr_departure_wizard.py` and
`wizard/hr_departure_wizard_views.xml`. Core3 now exposes the wizard from the
active employee detail form/API with the source fields Departure Reason,
Contract End Date, Set Contract End Date, Remove Related User, and Detailed
Reason. The action is HR-user gated (`employees.write`), company scoped, and
uses a row-version guard plus the Odoo contract-start date validation.

Registration is one atomic durable mutation: it records the reason,
description, departure and termination dates, archives the employee, moves the
state to `Terminated`, optionally closes the current contract, and removes the
related user only when no other active employee shares that user. Migration
`20260920160000-027-departure-wizard-fixtures.yaml` completes the stable demo
employee's user and contract-start fixture without adding rows to the existing
employee list. The focused integration test covers page/API ownership,
company-scoped reason options, persistence, restart replay, optional contract
and user side effects, invalid dates/reasons, stale/missing/cross-company
guards, and atomic failure behavior.

Authenticated browser/Odoo visual comparison for the modal remains open; this
bounded implementation claim is limited to YAML contracts, durable mutation,
and integration evidence.

## EMP-CREATE-USER-001: Create User bounded workflow (2026-09-20)

The next smallest unfinished Employee form action is Odoo's
`hr.employee.action_create_user`, exposed by the ERP-manager-only `Create User`
button in `views/hr_employee_views.xml` (the action has no standalone menu; it
lives on the employee form). Odoo opens a simplified `res.users` form with
defaults for employee name, work phone, and work email as login; the created
user is linked back to the employee. Core3 previously displayed only a plain
Related User field and had no create-user action or durable provisioning path.

Core3 now adds the page/API-bound `Create User` modal on
`/employees/detail`, gated by `auth.users.manage`, with deterministic defaults
from `employee_user_wizard`. The Employees migration adds an employee-link
lookup index; the shared auth schema remains the owner of user identity fields,
while the employee record retains the submitted work phone. The atomic API
workflow validates employee/company scope, existing links, login uniqueness,
deterministic user IDs, and employee row concurrency; it persists an invited
disabled auth user (`invite-pending`) and updates the employee's linked user,
work email, and work phone. Existing user-account editing remains owned by the
Base/Auth user surface.

The bounded test covers Odoo source/menu/button mapping, modal fields,
permission boundaries, deterministic persistence, duplicate/stale/missing and
invalid-login guards, rollback, migration replay, and file-backed restart.
Authenticated Core3/Odoo desktop and mobile captures remain a required QA gate
and must be recorded in the module evidence ledger before full-module sign-off.

The bounded QA capture is under
`evidence/employees/2026-09-20/EMP-CREATE-USER-001/`. Core3 authenticated
desktop/mobile checks run cleanly, but the seeded employee is outside the
authenticated `Core3 Demo Company` scope (`employee-demo-001` is seeded for
`Core3 Vietnam`), so no employee form or Create User modal is populated. The
page guard was tightened to require an employee id before rendering the action;
the empty company-scoped detail now correctly hides it. Odoo authenticated
desktop/mobile opens Abigail Peterson's Create User modal with Name, Login, and
Phone defaults. Seven unrelated app-icon 404s are recorded as reference-shell
noise. This remains bounded conditional evidence, not module sign-off.

## EMP-TEMPLATE-LOAD-001: employee Payroll Load a Template (2026-09-20)

Odoo's `hr_version_wizard_action` opens `hr.version.wizard` from the employee
Payroll tab. Its company-scoped template is copied through the Odoo whitelist
and linked to the employee's current version. Core3 implements this bounded
workflow with separate `pages/employee-detail.yaml` and
`api/employee-detail.yaml` contracts. The API exposes an employee wizard,
company-eligible template options, and an atomic mutation updating employee
contract fields plus current-version provenance.

Migration `20260920190000-030-employee-template-load.yaml` adds
`contract_template_id/name` to employees and employee versions and seeds the
deterministic `Engineering Vietnam` template. Focused tests cover source
mapping, durable copy, company/active/stale/template boundaries, migration
replay, and file-backed restart.

Focused verification is **4 tests / 26 assertions**; full Employees is
**75 tests / 817 assertions**; audit is **671 pages / 680 routes / 1,216
datasources**; scoped lint and diff-check pass. Authenticated Odoo Payroll and
modal captures pass desktop/mobile in
`evidence/employees/2026-09-20/EMP-TEMPLATE-LOAD-001/`. Authenticated Core3
desktop/mobile evidence is an exact blocker: Admin session company is
`Core3 Vietnam Branch`, seeded Employees data is `Core3 Vietnam`, and the
list is empty. No UI pass or aggregate Employees sign-off is claimed.

## EMP-BARCODE-GENERATE-001: employee Settings Generate Badge ID (2026-09-20)

The next smallest source-backed employee gap was Odoo's Settings-tab
`generate_random_barcode` action. Odoo's `hr_employee_views.xml:402-406`
places Generate beside the Badge ID field when empty, while
`hr_employee.py:244-247,1296-1301,1541-1543` defines uniqueness, the
alphanumeric/18-character constraint, and the `041` + nine-digit generator.

Core3 now binds `generate_employee_barcode` through the separate
`employee-detail` page/API contracts. The `employees.write` mutation requires
an authenticated actor, active/current-company employee, matching row version,
empty badge field, and a unique valid generated value. It persists the badge
ID and increments `row_version`; migration
`20260920200000-031-employee-barcode-generation.yaml` adds the durable unique
index. Deterministic employee-number-derived output keeps fixtures/restarts
reproducible while preserving Odoo's format.

Focused coverage is in `test/employees_barcode_generate.integration.test.ts`:
4 tests / 23 assertions, including source mapping, actor/company/active/stale/
retry guards, persistence, migration replay, unique-index presence, and
file-backed restart. Odoo authenticated Settings captures pass at desktop and
mobile in `evidence/employees/2026-09-20/EMP-BARCODE-GENERATE-001/`. Core3
authenticated desktop/mobile captures are an exact blocker: the session is
`Core3 Demo Company` while `employee-demo-003` is seeded in `Core3 Vietnam`,
so the company-scoped detail is empty and no Core3 action pass is claimed.

This slice completes Generate; the separate Odoo Print Badge report remains a
future bounded gap.

## EMP-PRINT-BADGE-001: employee Settings Print Badge report (2026-09-20)

The next smallest source-backed gap was Odoo's separate
`hr_employee_print_badge` report (`addons/hr/report/hr_employee_badge.xml:3-59`).
It is a `qweb-pdf` report bound to `hr.employee`, conditionally exposed beside
Badge ID in `hr_employee_views.xml:406`, and prints employee/company imagery,
name, job, and barcode.

Core3 implements the workflow with separate page/API YAML contracts. The
employee detail action is visible only when an active employee has a barcode;
it validates the authenticated actor, current company, barcode, row version,
actor identity, and company identity, durably records a deterministic
`employee_badge_print_runs` row, and navigates to the printable
`/employees/badge` page. Migration
`20260920210000-032-employee-badge-report.yaml` creates the report history table
and lookup index; replay/restart tests preserve the history.

Focused coverage is in `test/employees_print_badge.integration.test.ts`:
4 tests / 30 assertions. Odoo authenticated desktop/mobile Settings captures
show Print Badge; the desktop action produced `Badge - Abigail Peterson.pdf`.
Core3 desktop/mobile capture is an exact pre-auth blocker because the shared
runtime rejects an Auth page action with `actions[0].action` and
`actions[0].refresh` not allowed. No Core3 UI pass or module sign-off is
claimed. Evidence is under
`evidence/employees/2026-09-20/EMP-PRINT-BADGE-001/`.

## EMP-LOAD-SAMPLE-DATA-001: Employees empty-state Load Sample Data (2026-09-20)

Odoo's `action_hr_employee_load_demo_data` is an Employees server action bound
to the empty-list help in `addons/hr/views/hr_employee_views.xml`; it calls
`hr.employee._load_demo_data()` to load the HR scenario and reload safely when
the demo department already exists. Core3 implements the same bounded behavior
through separate `pages/employees.yaml` and `api/employees.yaml` contracts.

The API action requires an authenticated `employees.write` actor and a current
company, rejects non-empty active company scopes, inserts deterministic
company-scoped department and employee fixtures, and records the load in
`employee_sample_load_runs`. Migration
`20260920220000-033-employee-sample-load.yaml` creates the audit table and
company index. The load is idempotency guarded, migration-replay safe, and
survives a file-backed DuckDB restart.

Focused coverage is in `test/employees_sample_load.integration.test.ts`:
3 tests / 21 assertions, including source mapping, actor/company/empty-state
guards, deterministic persistence, and restart. Authenticated Core3 desktop
and mobile evidence shows the action, successful creation of Michael Williams,
Emma Granger, and Simon Jones, and reload persistence; Fleet is denied before
the action. Authenticated Odoo desktop/mobile captures show a healthy seeded
24-row list, but its empty-state comparison is blocked because the reference
company already has 24 employees. The exact comparison boundary and all
artifacts are under
`evidence/employees/2026-09-20/EMP-LOAD-SAMPLE-DATA-001/`.

## EMP-BANK-ACCOUNT-001: Employee Personal bank accounts and salary allocation (2026-09-20)

This slice maps Odoo hr.employee.bank_account_ids and salary_distribution from
addons/hr/models/hr_employee.py, plus the hr.bank.account.allocation.wizard
allocation-line workflow. Core3 keeps page YAML separate from API YAML: the
Personal notebook tab uses a durable LineItemGrid over employee_bank_accounts,
while the API provides guarded add/edit/delete server-form actions.

Migration 20260920230000-034 adds deterministic bank-account rows and indexes.
Mutations require an authenticated employees.write actor, enforce active employee
and current-company scope, parent/line row versions, duplicate account
protection, and allocation totals not exceeding 100 percent. Focused coverage
is 4 tests / 32 assertions; the UI audit is 679 pages / 688 routes / 1,247
datasources.

Authenticated evidence is under
evidence/employees/2026-09-20/EMP-BANK-ACCOUNT-001/. Core3 login and company
switching pass, but the authenticated company is Core3 Vietnam Branch while
fixtures are Core3 Vietnam, so the detail is empty. Odoo desktop/mobile
authentication passes, but all 24 reference employees have empty
bank_account_ids, so a populated allocation comparison is unavailable. These
are exact fixture/reference-data blockers; no aggregate Employees sign-off is
claimed.

## EMP-RELATED-USER-001: Existing Related User assignment (2026-09-21)

Odoo exposes `hr.employee.user_id` as an editable `res.users` relationship in
the employee Settings form and as a related-user list field. Core3 supported
creating a new invited user, but had no action for selecting or clearing an
existing user. This slice adds the bounded `edit_employee_related_user` action
and `employee_related_user_options` datasource with separate page/API YAML.

Migration `20260922090000-063` adds a unique employee relationship index and a
replay-safe Employees-local projection of deterministic `user-admin` and
`user-disp` identities. Assignment/clear updates `auth_user_id`, `user_name`,
and employee `row_version` durably. Guards cover actor, active current-company
employee, enabled catalog identity, duplicate linkage, and stale row version.
Focused verification is **4 tests / 24 assertions**, including restart.

Authenticated Odoo desktop/mobile captures and Core3 desktop/mobile attempts
are under `evidence/employees/2026-09-21/EMP-RELATED-USER-001/`. Core3 evidence
is conditional because the session company (`Core3 Demo Company`) does not
match the fixtures (`Core3 Vietnam`). The separate auth/Employees database
also leaves dynamic cross-service user search and normalized user-company
membership as explicit blockers. No aggregate Employees sign-off is claimed.

## EMP-EMERGENCY-CONTACT-001: Employee Personal emergency contact (2026-09-20)

The smallest remaining source-backed employee behavior is Odoo's HR-user-only
Personal-tab `Emergency Contact` group from
`addons/hr/views/hr_employee_views.xml`, backed by the scalar
`emergency_contact` and `emergency_phone` fields declared in
`addons/hr/models/hr_employee.py`.

Core3 adds migration `20260920240000-035` with idempotent columns and stable
fixtures, extends the page/API-separated employee detail contract and employee
create/edit CRUD, and keeps the group behind the existing authenticated
Employees read/write permissions. Optimistic row versions, current-company
scope, missing-record and stale-write guards apply to edits. Focused coverage
is **3 tests / 21 assertions**; full Employees is **79 tests / 762 assertions**;
the audit is **679 pages / 688 routes / 1,250 datasources**.

Authenticated Odoo desktop/mobile evidence is under
`evidence/employees/2026-09-20/EMP-EMERGENCY-CONTACT-001/` and shows the
Personal tab and Emergency Contact group at both viewports with no page errors
or overflow. Core3 authentication and viewport rendering were attempted, but
the shared checkout's page discovery returned HTTP 500 because an unrelated
concurrent page contains `components[0].row_action`; no other owner's file was
altered. The exact blocker and screenshots are recorded in the evidence
directory. No aggregate Employees sign-off is claimed.

## EMP-FAMILY-INFO-001: Employee Personal family information (2026-09-20)

The next smallest source-backed behavior is Odoo's Personal-tab Family group.
Odoo defines `marital`, `spouse_complete_name`, `spouse_birthdate`, and
`children` on `hr.version` in `addons/hr/models/hr_version.py`; the group and
conditional spouse fields are rendered by `hr_employee_views.xml`.

Core3 adds migration `20260920250000-036` with idempotent employee columns and
deterministic family fixtures, extends the page/API-separated employee
create/edit/read contract, and adds valid marital-status, non-negative
children, ISO birthdate, current-company, missing-record, and optimistic
stale-write guards. Focused coverage is **4 tests / 24 assertions**; audit is
**681 pages / 690 routes / 1,256 datasources**.

Authenticated evidence is under
`evidence/employees/2026-09-20/EMP-FAMILY-INFO-001/`. Core3 and Odoo both
render Family, Marital Status, Spouse Legal Name, Spouse Birthdate, and
Dependent Children at desktop and mobile with viewport-matched widths and no
page errors. Odoo records one unrelated aborted chatter request on desktop
and known app-icon 404s as shell noise. No aggregate Employees sign-off is
claimed.

## EMP-EDUCATION-001: Employee Personal education information (2026-09-20)

The smallest uncovered source-backed Personal behavior after Family Information
and Payroll Load a Template is Odoo's Education group: `certificate` and
`study_field` on `hr.employee`, rendered by `hr_employee_views.xml`.

Core3 adds migration `20260920260000-037-employee-education.yaml`, deterministic
company fixtures, page/API-separated employee detail and create/edit fields,
Odoo certificate choices, and existing employees.write company/row-version
guards. Focused CRUD, invalid-value, stale/company, replay, and restart tests
pass. Core3 desktop/mobile capture is blocked before authentication by the
shared page-discovery error `actions[0].title is not allowed`; the deterministic
fixture is `Core3 Vietnam` while the known Admin context is `Core3 Vietnam
Branch`. Authenticated Odoo Education labels are verified in the linked Family
capture. No aggregate Employees sign-off is claimed.

Evidence: `evidence/employees/2026-09-20/EMP-EDUCATION-001/`.

## EMP-BIRTH-IDENTITY-001: Employee Personal birth identity (2026-09-20)

The next smallest source-backed Personal Information behavior is Odoo's
`place_of_birth` and `country_of_birth` on `hr.employee`, plus `sex` on
`hr.version`; the source view exposes these in Personal Information and
Gender choices are male, female, and other.

Core3 adds migration `20260920280000-038`, deterministic company-scoped
fixtures, page/API-separated create/edit/read fields, and a gender guard.
Focused CRUD, invalid selection, stale row-version, cross-company atomicity,
migration replay, and file-backed restart coverage passes **4 tests / 21
assertions**. Audit is **684 pages / 693 routes / 1,264 datasources**;
scoped ESLint and diff-check pass.

Authenticated Core3 desktop/mobile renders all three labels with no page or
HTTP errors, but fixture values are withheld because the session is `Core3
Vietnam Branch` while the deterministic fixture row is `Core3 Vietnam`.
Authenticated Odoo desktop/mobile reaches Abigail Peterson's Personal tab and
renders Place of Birth and Gender, but not the exact Country of Birth label;
the reference presents Nationality (Country) elsewhere. No aggregate
Employees sign-off is claimed.

Evidence: `evidence/employees/2026-09-20/EMP-BIRTH-IDENTITY-001/`.

## EMP-EMPLOYEE-SKILLS-001: Employee current skill assignments (2026-09-20)

The smallest remaining source-backed employee-form behavior is Odoo's
`hr.employee.current_employee_skill_ids` `skills_one2many` widget and its
`open_hr_employee_skill_modal` action from `hr_skills`. The source model is
`hr.employee.skill`; regular skills select a category, skill, and level, keep
validity dates, reject duplicate active skills, and are archived rather than
deleted.

Core3 adds migration `20260920290000-039-employee-skill-assignments.yaml` with
deterministic employee/company-scoped skill rows, an API datasource plus
catalogs and guarded add/archive actions, and a page-only Work-tab
`LineItemGrid` joined by `page.id`. Focused coverage is **4 tests / 27
assertions**, including source mapping, CRUD/archive, actor/company/relation/
duplicate/date/concurrency guards, migration replay, and file-backed restart.
Audit is **686 pages / 695 routes / 1,272 datasources**; scoped ESLint and
diff-check pass.

Authenticated Core3 desktop/mobile reached the employee route after a 200
company switch, but the fixture is `Core3 Vietnam` while the authenticated
company is `Core3 Vietnam Branch`; the company guard correctly hides the
employee and skill rows. Authenticated Odoo desktop/mobile reached Abigail
Peterson's Work tab, but the installed reference did not render a populated
Skills widget for that employee. Seven known app-icon 404s are shell noise.
Evidence records both boundaries; no aggregate Employees sign-off is claimed.

Evidence: `evidence/employees/2026-09-20/EMP-EMPLOYEE-SKILLS-001/`.

## EMP-RESUME-LINES-001: Employee Resume lines (2026-09-20)

The next smallest source-backed employee-form behavior is Odoo's
`hr.resume.line` `resume_line_ids` relation and `resume_one2many` widget from
`hr_skills`. Odoo supports employee-linked section, title, dates, duration,
course type, description, and external URL CRUD; its source constraint requires
the start date to precede the end date.

Core3 adds migration `20260920300000-040-employee-resume-lines.yaml` with
Odoo's three resume sections and deterministic employee fixtures, a separate
API datasource/catalog and guarded add/edit/delete actions, and a page-only
Resume-tab `LineItemGrid` joined by `page.id`. Focused coverage is **4 tests /
30 assertions**, including source mapping, CRUD, actor/company/type/date/
duplicate/concurrency guards, migration replay, and file-backed restart. Audit
is **687 pages / 696 routes / 1,279 datasources**; scoped ESLint and diff-check
pass.

Authenticated Core3 desktop/mobile company switching returned 200, but the
fixture company is `Core3 Vietnam` versus the authenticated `Core3 Vietnam
Branch`, so the guarded route hides the employee and Resume lines. Authenticated
Odoo desktop/mobile reached Abigail Peterson's Resume tab, but the selected
reference employee had no populated resume-line values. Seven known app-icon
404s are shell noise. No aggregate Employees sign-off is claimed.

Evidence: `evidence/employees/2026-09-20/EMP-RESUME-LINES-001/`.

## EMP-EMPLOYEE-VERSION-DETAIL-001: Employee Record snapshot detail (2026-09-21)

Odoo's Employee Records action (`action_hr_version`) exposes a clickable
`hr.version` row; its `action_open_version` returns the employee form with the
selected version context. Core3 already had durable current, future, expired,
and archived `employee_versions` fixtures and list route, but lacked the
row-open snapshot contract. This slice adds a read-only
`/employees/versions/detail` page/API pair, company-scoped `hr.version`
projection, list row/double-click navigation, and an Open employee action.

The detail preserves effective date, contract dates/state, employee, company,
job, department, schedule, wage, template, and note without exposing writes.
`employees.read` and current-company scope apply to both list and detail; the
existing migration/restart fixture proves durable snapshots. Focused coverage
is **3 tests / 21 assertions**. Authenticated Core3 desktop/mobile routes and
titles load with zero browser/request errors, but the Admin session is
`Core3 Demo Company` while deterministic versions belong to `Core3 Vietnam`,
so the populated snapshot is correctly absent. Authenticated Odoo desktop
shows 28 Employee Records and opens Abigail Peterson's employee form from a
version row; the mobile detail route also loads authenticated. Evidence is
under `evidence/employees/2026-09-21/EMP-EMPLOYEE-VERSION-DETAIL-001/`.
This remains bounded conditional evidence, not module sign-off.

## EMP-BANK-TRUST-001: Employee primary bank-account trust toggle (2026-09-21)

Odoo's `action_toggle_primary_bank_account_trust` is the Personal-tab action
beside the primary bank account. It flips the selected account's
`allow_out_payment` flag, with Trust/Untrust presentation in the employee
form. Core3 previously persisted bank rows and exposed the trusted field for
line CRUD, but had no explicit source-action binding.

Core3 adds the page/API-separated `toggle_employee_bank_account_trust` row
action. It requires `employees.write`, a non-empty actor, an active employee in
the current company, and matching parent employee and bank-account row
versions. The mutation atomically flips `employee_bank_accounts.trusted`,
increments both row versions, and returns the updated durable row. Existing
migration `20260920230000-034-employee-bank-accounts.yaml` supplies the
replay-safe trusted column and deterministic primary/secondary fixtures; no
duplicate migration was introduced.

Focused coverage is `test/employees_bank_account_trust.integration.test.ts`:
3 tests / 20 assertions for source mapping, page/API separation, actor,
company, parent/line concurrency guards, durable toggle, migration replay, and
file-backed restart. Core3 browser capture is blocked before authentication by
the existing shared Employees discovery error `PageSchemaError: actions[4].fields
is not allowed`. Authenticated Odoo desktop/mobile reaches Abigail Peterson's
Personal tab, but the reference employee has no bank-account rows. Exact
blockers and captures are under
`evidence/employees/2026-09-21/EMP-BANK-TRUST-001/`. No aggregate Employees
sign-off is claimed.

## EMP-BANK-ALLOCATION-001: Employee salary allocation wizard (2026-09-21)

Odoo's `hr.employee.action_open_allocation_wizard` creates the transient
`hr.bank.account.allocation.wizard` from the Personal bank-account group. Its
editable allocation lines copy each account's amount, percentage/fixed type,
sequence, and trust state; `action_save` writes the distribution and rejects a
percentage total other than 100%.

Core3 adds `/employees/bank-allocations` with separate page/API contracts. The
employee Personal bank grid opens the page; its durable line editor updates
amount/type/trust under `employees.write`, actor, current-company, and parent /
line row-version guards. `Save Allocation` requires an exact 100% percentage
total, records `employee_bank_allocation_runs`, and increments the employee
row version atomically. Migration `20260921110000-041` is idempotent and reuses
the existing deterministic bank rows rather than duplicating fixtures.

Focused coverage is `test/employees_bank_allocation.integration.test.ts`:
4 tests / 26 assertions for source mapping, navigation, line CRUD, exact-total
validation, permissions, concurrency, migration replay, and restart. Core3
authenticated desktop/mobile route captures render the guarded empty state
because the session is `Core3 Demo Company` while fixtures are `Core3 Vietnam`.
Authenticated Odoo desktop/mobile reaches Abigail Peterson's Personal tab, but
the reference employee has no bank-account rows. Evidence is under
`evidence/employees/2026-09-21/EMP-BANK-ALLOCATION-001/`; no aggregate
Employees sign-off is claimed.

## EMP-VISA-WORK-PERMIT-001: Employee Visa & Work Permit details (2026-09-21)

Odoo's Personal-tab `Visa & Work Permit` group exposes `visa_no`, `visa_expire`,
`permit_no`, `work_permit_expiration_date`, and the `has_work_permit` binary
document widget with its computed filename. Core3 adds the corresponding
Personal group in the page YAML and projects the fields through the separate
`employee-detail` API/action YAML. The bounded Core3 document contract stores
deterministic document presence and filename metadata; binary attachment upload
remains an explicit follow-up boundary rather than an invented implementation.

Migration `20260921120000-042-employee-visa-work-permit.yaml` adds the durable
columns and replay-safe fixtures. Employee create/edit uses `employees.write`,
current-company, optimistic row-version, ISO-date, and document-metadata guards.
Focused coverage is **4 tests / 23 assertions**, including source mapping,
create/edit/read, invalid/stale/company guards, migration replay, and file-backed
restart.

Authenticated Core3 desktop/mobile captures show the new labels and HTTP 200
page loads, but `Core3 Demo Company` does not expose the `Core3 Vietnam`
deterministic employee. Authenticated Odoo desktop/mobile reaches Abigail
Peterson's Personal tab and shows the source Visa & Work Permit group; seven
unrelated app-icon 404s are recorded. Evidence is under
`evidence/employees/2026-09-21/EMP-VISA-WORK-PERMIT-001/`. This is conditional
feature evidence, not aggregate Employees sign-off.

## EMP-HR-RESPONSIBLE-001: Employee HR responsible approver (2026-09-21)

Odoo's employee Settings page exposes `hr.version.hr_responsible_id` in the
Approvers group as the HR responsible user. This is distinct from the Payroll
Contract Type slice. Core3 adds durable `hr_responsible_name` projections on
employees and current employee versions, a write-gated Settings Approvers
group, and a dedicated `employees.write` action for the HR Responsible field.

Migration `20260921210000-051-employee-hr-responsible.yaml` seeds stable HR
Manager and People Operations fixtures and is replay-safe. The API action has
actor, active/current-company, supported-value, and optimistic row-version
guards; successful edits synchronize the current active version. Focused
coverage is **4 tests / 20 assertions**, including source mapping,
create/edit/read, current-version synchronization, invalid/stale/company and
actor atomicity, migration replay, and file-backed restart.

Authenticated Core3 desktop/mobile captures render Settings / Approvers / HR
Responsible with no browser/request errors or overflow, but the session is
`Core3 Demo Company` while the deterministic row is `Core3 Vietnam`. Odoo
desktop/mobile render Abigail Peterson's source control, but the reference
approver is blank. Evidence is under
`evidence/employees/2026-09-21/EMP-HR-RESPONSIBLE-001/`; this is conditional
feature evidence, not aggregate Employees sign-off.

## EMP-CONTRACT-TYPE-001: Employee Payroll contract type (2026-09-21)

Odoo's Payroll page exposes the manager-only `hr.version.contract_type_id`
relation as `Contract Type`; the separate Contract Types configuration menu is
inactive in the supplied source, so this slice stays bounded to the employee
workflow. Core3 adds the durable `contract_type_name` projection and a
dedicated `employees.manage` action that updates both the employee and its
current active employee-version record.

Migration `20260921200000-050-employee-contract-type.yaml` seeds stable
Permanent, Temporary, and Contractor values and is replay-safe. The page
Payroll Contract Overview is manager-gated; the API action has actor,
active/current-company, supported-value, and optimistic row-version guards.
Focused coverage is **4 tests / 20 assertions**, including source mapping,
create/edit/read, current-version synchronization, invalid/stale/company and
actor atomicity, migration replay, and file-backed restart.

Authenticated Core3 desktop/mobile captures render the Payroll and Contract
Type labels with no browser/request errors or overflow, but the session is
`Core3 Demo Company` while the deterministic row is `Core3 Vietnam`. Odoo
desktop/mobile render Abigail Peterson's source Contract Type label, but the
reference value is blank. Evidence is under
`evidence/employees/2026-09-21/EMP-CONTRACT-TYPE-001/`; this is conditional
feature evidence, not aggregate Employees sign-off.

## EMP-WORK-MOBILE-001: Employee Work Mobile (2026-09-21)

Odoo's employee form exposes `hr.employee.mobile_phone` as the visible Work
Mobile phone field beside the work email and work phone. Core3 adds the field
to the paired employee-detail page/API contracts and durable migration
`20260921190000-049-employee-work-mobile.yaml`, with deterministic values for
the supplied demo employees.

Create and edit remain protected by `employees.write`, current-company scope,
and optimistic row-version concurrency. Focused coverage is **4 tests / 16
assertions**, including source mapping, CRUD, stale/company atomicity,
migration replay, and file-backed restart.

Authenticated Odoo desktop/mobile captures show the Work Mobile label at
1440x900 and 390x844 without browser errors or overflow; Abigail Peterson's
reference value is empty. Core3 cannot boot because global discovery stops on
the unrelated Inventory errors `search.categories is not allowed` and
`search.or locations... is not allowed`. No Core3 UI pass or aggregate Employees
sign-off is claimed. Evidence is under
`evidence/employees/2026-09-21/EMP-WORK-MOBILE-001/`.

## EMP-DOCUMENTS-001: Employee identity documents (2026-09-21)

Odoo's Personal-tab Documents group visibly exposes the binary
`hr.employee.id_card` and `hr.employee.driving_license` fields. Core3 adds the
paired page/API fields and durable migration
`20260921180000-048-employee-documents.yaml`. Because this YAML-first sample
does not yet have a binary attachment transport, the bounded representation
stores document presence and filename metadata explicitly; binary upload is not
claimed or invented.

Create/edit require `employees.write`, current-company scope, optimistic
row-version concurrency, and a filename invariant whenever either document is
present. Focused coverage is **4 tests / 23 assertions**, including Odoo source
mapping, page/API separation, CRUD, invalid/stale/company atomicity, migration
replay, and file-backed restart.

Authenticated Odoo desktop/mobile captures reach Abigail Peterson's Personal
Documents group with ID Card Copy and Driving License visible, at 1440x900 and
390x844 with no browser errors or overflow. Core3 cannot boot because global
discovery stops on the unrelated Inventory error `components[2].title is not
allowed`; no Core3 UI pass or aggregate Employees sign-off is claimed. Evidence
is under `evidence/employees/2026-09-21/EMP-DOCUMENTS-001/`.

## EMP-CITIZENSHIP-001: Employee citizenship details (2026-09-21)

Odoo's Personal-tab `Citizenship` group exposes nationality, national
identification, SSN, passport number, and passport expiration. Core3 adds the
corresponding page-only group and projects the fields through the separate
`employee-detail` API/action YAML. `country_id` is represented as a durable
company-scoped country-name projection because this bounded sample service has
no country catalog relation; the source field and label remain explicit.

Migration `20260921130000-043-employee-citizenship.yaml` adds the durable
columns and replay-safe fixtures. Employee create/edit uses `employees.write`,
current-company, optimistic row-version, and ISO passport-expiration guards.
Focused coverage is **4 tests / 21 assertions**, including source mapping,
create/edit/read, invalid/stale/company guards, migration replay, and file-backed
restart.

Authenticated Core3 desktop/mobile captures show the new labels and HTTP 200
page loads, but `Core3 Demo Company` does not expose the `Core3 Vietnam`
deterministic employee. Authenticated Odoo desktop/mobile reaches Abigail
Peterson's Personal tab and shows the source Citizenship group; seven unrelated
app-icon 404s are recorded. Evidence is under
`evidence/employees/2026-09-21/EMP-CITIZENSHIP-001/`. This is conditional
feature evidence, not aggregate Employees sign-off.

## EMP-PRIVATE-LOCATION-001: Employee private location details (2026-09-21)

Odoo's Personal-tab Location group exposes structured private street, street 2,
city, state, ZIP, country, and home-to-work distance/unit fields. Core3 adds a
page-only Personal Location group and projects the fields through the separate
`employee-detail` API/action YAML. `private_state_id` and `private_country_id`
are durable visible-name projections because this bounded sample service has no
shared state/country catalog relation.

Migration `20260921140000-044-employee-private-location.yaml` adds the durable
columns and replay-safe fixtures. Employee create/edit uses `employees.write`,
current-company, optimistic row-version, non-negative distance, and kilometers /
miles unit guards. Focused coverage is **4 tests / 23 assertions**, including
source mapping, create/edit/read, invalid/stale/company guards, migration replay,
and file-backed restart.

The authenticated Odoo desktop/mobile Personal captures show the source
Location group. Core3 runtime evidence is blocked before authentication by an
unrelated shared Inventory page schema error (`components[1].search.lots` and
`components[1].search.or packages...` are not allowed); no Core3 UI sign-off is
claimed. Evidence is under
`evidence/employees/2026-09-21/EMP-PRIVATE-LOCATION-001/`.

## EMP-PRIVATE-CONTACT-001: Employee private contact details (2026-09-21)

Odoo's Personal-tab `Private Contact` group exposes the HR-private email and
`private_phone` fields. Core3 previously rendered a generic `phone` value beside
`private_email`; this slice adds the source-named durable `private_phone` field,
uses the paired page/API employee-detail contracts, and preserves the existing
legacy phone projection outside the Private Contact group.

Migration `20260921150000-045-employee-private-contact.yaml` adds the durable
column and replay-safe private-contact fixtures. Employee create/edit uses
`employees.write`, current-company, and optimistic row-version guards.
Focused coverage is **4 tests / 18 assertions**, including source mapping,
create/edit/read, stale/company guards, migration replay, and file-backed
restart.

Authenticated Core3 desktop/mobile page loads return HTTP 200 and render the
private-contact labels, but the deterministic employee is `Core3 Vietnam` and
the authenticated session is `Core3 Demo Company`. Authenticated Odoo
desktop/mobile reaches Abigail Peterson's Personal tab and shows the source
Private Contact group; seven unrelated app-icon 404s are recorded. Evidence is
under `evidence/employees/2026-09-21/EMP-PRIVATE-CONTACT-001/`. This is
conditional feature evidence, not aggregate Employees sign-off.

## EMP-PRIVATE-CAR-PLATE-001: Employee private car plate search/list behavior (2026-09-21)

Odoo defines the HR-user-only `hr.employee.private_car_plate` field and exposes
it in the Employees search view. Core3 now persists the field on `employees`,
seeds deterministic company fixtures, projects it in the Employees list with an
optional hidden column, includes it in employee search, and carries it through
the employee create/edit API contract. The page YAML and API YAML remain
separate and join at `employees`.

The existing `employees.write` create/edit mutations enforce current-company
scope and optimistic row-version concurrency; `employees.read` controls the
list projection. Focused coverage is **4 tests / 21 assertions**, including
Odoo source mapping, CRUD/list/read persistence, stale and wrong-company
atomicity, migration replay, and file-backed restart.

Authenticated Odoo desktop/mobile list captures are under
`evidence/employees/2026-09-21/EMP-PRIVATE-CAR-PLATE-001/`. The optional source
search field is hidden in Odoo's default list rendering, and the source
reference has unrelated app-icon 404 noise. Core3 browser capture was blocked:
the bounded memory-mode runtime served Vite but never bound backend port 3001;
the exact attempt is recorded in the evidence. This is conditional feature
evidence, not aggregate Employees sign-off.

## EMP-BIRTHDAY-VISIBILITY-001: Employee birthday visibility (2026-09-21)

Odoo's Personal Information group exposes `birthday_public_display` as the
`Show to all employees` checkbox. The source computes
`birthday_public_display_string` as the day and month only when a birthday is
present and the employee opted in; the public directory hides it otherwise.

Core3 adds migration `20260921160000-046` with replay-safe birthday and
visibility fixtures, separate employee-detail page/API fields, and a
directory-safe birthday projection. Employee create/edit remains guarded by
`employees.write`, current-company scope, and optimistic row-version
concurrency. Focused coverage is **4 tests / 22 assertions**, including source
mapping, create/edit directory visibility, stale/company atomicity, migration
replay, and file-backed restart.

Authenticated Core3 desktop/mobile captures render the new label and return
HTTP 200, but the deterministic `Core3 Vietnam` employee is hidden from the
authenticated `Core3 Demo Company` session. Authenticated Odoo desktop/mobile
reach Abigail Peterson's Personal tab, but that source employee has no
birthday, so Odoo correctly hides the conditional checkbox. Evidence is under
`evidence/employees/2026-09-21/EMP-BIRTHDAY-VISIBILITY-001/`. This is
conditional feature evidence, not aggregate Employees sign-off.

## EMP-LEGAL-NAME-001: Employee legal name (2026-09-21)

Odoo's `hr.employee.legal_name` is an editable, stored field in the Personal
Information group. Its source compute defaults an empty value to the employee
name. Core3 adds the durable `legal_name` column with migration
`20260921170000-047`, deterministic demo values, and a separate page field plus
employee-detail/create/edit API fields. Create applies the same source-backed
fallback when legal name is omitted.

Create and edit require `employees.write`, current-company scope, and the
existing optimistic row-version guard. Focused coverage is **4 tests / 18
assertions**, including source mapping, fallback CRUD, stale/company atomicity,
migration replay, and file-backed restart.

Authenticated Odoo desktop/mobile captures show Abigail Peterson's Personal
Information Legal Name. Core3 desktop authenticates and renders the new label,
but the deterministic employee is `Core3 Vietnam` while the session is
`Core3 Demo Company`. Core3 mobile is additionally blocked by a shared
Inventory page-discovery error referencing unresolved `inventory_route_detail`
and related actions/datasources; Employees did not modify Inventory. Evidence is
under `evidence/employees/2026-09-21/EMP-LEGAL-NAME-001/`. This is conditional
feature evidence, not aggregate Employees sign-off.

## EMP-ATTENDANCE-PIN-001: Attendance and Point of Sale PIN (2026-09-21)

Odoo's employee Settings tab exposes the HR-user-only `hr.employee.pin` field
under Attendance/Point of Sale. The source model documents this PIN as the
credential used by Attendance kiosk check-in/out and Point of Sale cashier
switching; the form label is `PIN Code`.

Core3 adds migration `20260921220000-052` with deterministic employee PIN
fixtures, a separate page-only Settings group, and the matching
`employee-detail` API datasource/action. Employee creation accepts an optional
PIN, while edits use a dedicated `employees.write` action guarded by actor,
active/current-company, optimistic row-version, and digits-only validation.
Blank PINs clear the durable value, matching Odoo's optional Char field. PIN
values are rendered as password inputs in action forms and read-only in the
Settings projection; barcode generation/printing remains a separate completed
workflow.

Focused coverage is **4 tests / 20 assertions**, including source mapping,
create/edit/read, actor/stale/company/invalid guards, migration replay, and
file-backed restart. Authenticated Core3 and Odoo desktop/mobile comparison
captures are recorded under
`evidence/employees/2026-09-21/EMP-ATTENDANCE-PIN-001/`. Evidence is
conditional and does not claim aggregate Employees sign-off.

## EMP-COACH-001: Employee coach projection and assignment (2026-09-21)

Odoo's `hr.employee.coach_id` is a company-scoped relation exposed in the
Employees search view and as an optional employee-list column. Core3 now
projects the durable `coach_name` in the Employees list, supports a current-
company Coach filter, and exposes Coach in Work with a guarded Edit Coach
action. Migration `20260921230000-053` seeds deterministic coach relations.

Create and edit use `employees.write`, actor identity, active/current-company
scope, optimistic row-version concurrency, and active-coach validation. Page
YAML and API/action YAML remain separate and join by `page.id`. Focused
coverage is **4 tests / 23 assertions**, including source mapping, CRUD,
invalid/stale/company/actor guards, migration replay, and restart.

Authenticated Core3 and Odoo desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-COACH-001/`. Core3's authenticated session
uses `Core3 Demo Company` while deterministic Employees fixtures are in
`Core3 Vietnam`, so the Core3 list is empty; Odoo's Coach column is optional
and hidden in the default list view. This is conditional feature evidence,
not aggregate Employees sign-off.

## EMP-EMPLOYEE-PROPERTIES-001: Employee Properties (2026-09-21)

Odoo's `hr.employee.employee_properties` is an HR-user-only dynamic Properties
field rendered above the employee form notebook; the source search view also
offers a Properties group-by. Core3 now stores the company-defined object as
durable `employees.employee_properties` JSON text, displays it in a separate
read-gated Properties group, and provides a guarded `Edit Properties` action.
Migration `20260922000000-054` seeds deterministic object values.

Create/edit uses `employees.write`, actor identity, active/current-company
scope, optimistic row-version concurrency, and object-shape validation. Page
YAML and API/action YAML remain separate and join by `page.id`. Focused
coverage is **4 tests / 19 assertions**, including source mapping, CRUD,
invalid/stale/company/actor guards, migration replay, and restart.

Authenticated Odoo employee-detail captures are under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-PROPERTIES-001/`; the reference
company has no configured Properties definition/value, so the source field is
not visible in rendered text. Core3 backend startup was unavailable during the
bounded browser window and is recorded precisely in the evidence. This is
conditional feature evidence, not aggregate Employees sign-off.

## EMP-PAY-CATEGORY-001: Employee Payroll Pay Category (2026-09-21)

Odoo's manager-only Payroll form renders `hr.version.structure_type_id` as
`Pay Category`. Core3 now persists the bounded supported structure names as
`pay_category_name` on employees and employee versions, seeds deterministic
fixtures, projects the value in its manager-gated Payroll Pay Category group,
and exposes a dedicated Edit Pay Category action. Page YAML and API/action YAML
remain separate and join at `employee-detail`.

The action requires `employees.manage`, actor identity, an active employee in
the current company, an active current Payroll record, a supported value, and
optimistic row-version concurrency before updating both durable records.
Focused coverage is **4 tests / 21 assertions**, including source mapping,
durable update, actor/company/stale/value guards, migration replay, and restart.

Authenticated Odoo desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-PAY-CATEGORY-001/`; mobile visibly renders
Pay Category while desktop remained on Work during the bounded interaction.
Core3 backend port 3001 did not bind during the bounded memory-mode attempt.
This is conditional feature evidence, not aggregate Employees sign-off.

## EMP-WORKING-HOURS-001: Employee-specific Working Hours assignment (2026-09-21)

Odoo's Payroll form exposes `hr.employee.resource_calendar_id` as Working
Hours; the relation is backed by the current `hr.version.resource_calendar_id`
and is company-scoped. Core3 previously exposed only the employee's free-text
schedule projection and the separate working-schedule catalog. This slice adds
the missing employee-to-schedule assignment lifecycle.

Migration `20260922030000-057` adds durable `working_schedule_id` columns to
employees and employee versions, backfills deterministic relations from the
existing schedule names, and synchronizes the legacy display name. The paired
employee-detail page/API contracts add a manager-gated Working Hours group,
schedule options datasource, and guarded Edit Working Hours action. The action
updates the employee and active Payroll record together and enforces actor,
current-company schedule eligibility, active-record, and optimistic row-version
guards.

Focused coverage is **4 tests / 20 assertions**, including source mapping,
durable update, actor/value/stale/company guards, migration replay, and
file-backed restart. Authenticated Odoo desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-WORKING-HOURS-001/`; the reference label is
visible at both viewports. The bounded Core3 runtime printed its backend URL
but never bound port 3001, so Core3 browser comparison remains a precise
conditional blocker. No aggregate Employees sign-off is claimed.

## EMP-WORK-ADDRESS-001: Employee Work Address assignment (2026-09-21)

Odoo's Work tab exposes the current Payroll version's `hr.version.address_id`
as Work Address before Work Location. Core3 previously kept only an untyped
`address_name` display value in the broad employee editor. This slice adds the
missing company-scoped employee Work Address assignment lifecycle without
duplicating Work Location assignment.

Migration `20260922050000-059` adds a deterministic `employee_work_addresses`
catalog, durable `work_address_id` columns on employees and employee versions,
and replay-safe relation backfills. The paired employee-detail page/API
contracts add address options and a guarded Edit Work Address action. The
action updates the employee and active Payroll record together and enforces
actor, active/current-company, supported-address, active-version, and
optimistic row-version guards.

Focused coverage is **4 tests / 22 assertions**. Authenticated Odoo
desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-WORK-ADDRESS-001/`. Core3 startup was blocked
by an unrelated concurrent page schema error (`components[3].title`), recorded
precisely in the evidence. No aggregate Employees sign-off is claimed.

## EMP-WORK-LOCATION-ASSIGNMENT-001: Employee Work Location assignment (2026-09-21)

Odoo's Work tab exposes the current Payroll version's
`hr.version.work_location_id` as Work Location. The source relation is
company/address constrained. Core3 already had the standalone Work Locations
catalog, but the employee detail only projected a free-text work location.
This slice adds the missing employee-to-location assignment lifecycle.

Migration `20260922040000-058` adds durable `work_location_id` columns to
employees and employee versions, backfills deterministic relations, and keeps
the existing display names stable. The paired employee-detail page/API
contracts add an employee Work Location options datasource and guarded Edit Work
Location action. The action updates the employee and active Payroll record and
requires actor identity, active/current-company scope, an active location
matching the employee address, an active version, and optimistic row-version
concurrency.

Focused coverage is **4 tests / 20 assertions**. Authenticated Odoo
desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-WORK-LOCATION-ASSIGNMENT-001/`; both show the
control. The bounded Core3 runtime did not bind port 3001, so Core3 browser
comparison remains conditional. No aggregate Employees sign-off is claimed.

## EMP-MANAGER-001: Employee Manager relation assignment (2026-09-21)

Odoo's `hr.employee.parent_id` is a company-scoped Many2one Manager rendered in
the Work tab and employee list/search views. Core3 previously exposed only a
free-text `manager_name`, so it could not provide relation options or enforce
the Odoo parent boundary. This slice adds durable `manager_id` columns to the
employee and active Payroll-version records, synchronized `manager_name` and
organization-chart projections, and a company-scoped manager options source.

The paired employee-detail API/page contracts add `edit_employee_manager`.
The action requires `employees.write`, an authenticated actor, an active
employee in the current company, an active same-company manager, and the
employee row version. Self, subordinate-cycle, wrong-company, and stale
assignments reject atomically; clearing the nullable relation remains
supported. Migration replay is deterministic and file-backed restart retains
the relation.

Focused verification is **4 tests / 24 assertions**. Authenticated Odoo
desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-MANAGER-001/`; both show Manager. Core3
startup reached Vite but did not bind backend port 3001 because the bounded
runtime hit DuckDB's `Adding columns with constraints not yet supported`
startup error; the exact conditional blocker is recorded in the evidence.
No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-TYPE-001: Employee Payroll Employee Type (2026-09-21)

Odoo's `hr.version.employee_type` is a required HR-user Payroll selection with
Employee, Worker, Student, Trainee, Contractor, and Freelancer values. Core3
previously had only the narrower legacy `employment_type` field, so it did not
provide the source-backed Payroll selection or its active-version persistence.

Migration `20260922070000-061` adds durable `employee_type` columns to
employees and employee versions and deterministically backfills the existing
fixtures. The paired employee-detail API/page contracts add the Payroll
Employee Type group and guarded `edit_employee_type` action. The action
updates the employee and active Payroll version together, synchronizes the
legacy display projection, and enforces actor, active/current-company,
supported-value, active-version, and optimistic row-version guards.

Focused verification is **4 tests / 25 assertions**. Authenticated Odoo
desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-TYPE-001/`; both show Employee
Type. Core3 discovery reached Vite but failed before backend port 3001 bound
on the unrelated `components[1].title is not allowed` page-schema error; the
exact conditional blocker is recorded in the evidence. No aggregate Employees
sign-off is claimed.

## EMP-CONTRACT-PERIOD-001: Employee Payroll Contract Dates (2026-09-21)

Odoo's Payroll form exposes the active `hr.version.contract_date_start` and
`contract_date_end` fields as Contract Start Date and Contract End Date. Core3
previously exposed only employee-level dates through the broad editor, without
an active Payroll-version synchronization or manager-scoped date action.

Migration `20260922080000-062` deterministically reconciles existing employee
and active Payroll contract dates. The paired employee-detail API/page
contracts add a manager-only Contract Dates group and guarded
`edit_employee_contract_period` action. It updates the employee and active
Payroll version together and enforces actor, active/current-company,
supported ISO-date, start-before-end, active-version, and optimistic
row-version guards.

Focused verification is **4 tests / 23 assertions**. Authenticated Odoo
desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-CONTRACT-PERIOD-001/`; both show the
compact Contract date range. Core3 discovery failed before backend port 3001
bound because unrelated Inventory actions were unknown; the exact conditional
blocker is recorded in the evidence. No aggregate Employees sign-off is
claimed.

## EMP-WAGE-001: Active Payroll Wage (2026-09-21)

Odoo renders `hr.version.wage` as an editable manager-only Payroll field in
Contract Overview and exposes it in employee records. Core3 already projected
an employee-level wage through broad CRUD, but did not offer a dedicated
active-Payroll wage action or synchronize the employee and current
`employee_versions` record together.

Migration `20260922100000-064` replay-safely reconciles existing wage values.
The paired API/page contracts add `edit_employee_wage`, a manager-gated action
that updates both projections with non-negative validation, actor,
current-company, active-version, and optimistic concurrency guards. Focused
verification is **4 tests / 20 assertions**, including replay and restart.

Authenticated Odoo desktop/mobile Payroll captures are under
`evidence/employees/2026-09-21/EMP-WAGE-001/` and show Wage. Core3 browser
evidence is conditional because global discovery stops on the unrelated
`actions[1].title is not allowed` page-schema error before backend bind. No
aggregate Employees sign-off is claimed.

## EMP-JOB-POSITION-001: Employee Job Position relation (2026-09-21)

Odoo renders the company-checked `hr.version.job_id` relation as Job Position
in the employee Work tab. Core3 previously exposed only the free-text
`job_position_name` projection and a standalone Job Positions catalog. This
slice adds the missing employee-to-position assignment lifecycle.

Migration `20260922110000-065` adds durable `job_id` columns to employees and
employee versions, seeds deterministic Core3 Vietnam positions, and
replay-safely backfills existing display names. The paired employee-detail
API/page contracts add company-scoped Job Position options and guarded
`edit_employee_job_position`; assignment updates both employee and active
Payroll-version projections and clearing remains supported.

Focused verification is **4 tests / 23 assertions**, covering Odoo source
mapping, assign/clear CRUD, actor/company/invalid/stale guards, migration
replay, and file-backed restart. Authenticated Odoo desktop/mobile captures
are under `evidence/employees/2026-09-21/EMP-JOB-POSITION-001/` and show Job
Position. Core3 browser evidence is conditional: the bounded runtime exited
before the route completed and the exact connection-refused blocker is in
`verification.md`. No aggregate Employees sign-off is claimed.

## EMP-DEPARTMENT-001: Employee Department relation (2026-09-21)

Odoo renders the company-checked `hr.version.department_id` relation as
Department in the employee Work tab and employee list/search views. Core3
previously exposed only the employee-level `department_name`/`department_id`
projection and had no dedicated employee assignment action or active
Payroll-version synchronization.

Migration `20260922120000-066` adds durable `department_id` to employee
versions and replay-safely backfills existing version projections. The paired
employee-detail API/page contracts add company-scoped active Department
options and guarded `edit_employee_department`; assignment updates both the
employee and active Payroll record, while clearing the nullable relation is
supported.

Focused verification is **4 tests / 23 assertions**, covering source mapping,
assign/clear CRUD, actor/company/invalid/stale guards, migration replay, and
file-backed restart. Authenticated Odoo desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-DEPARTMENT-001/` and show Department.
Core3 browser evidence is conditional because shared page discovery fails on
`components[4].title is not allowed`; no aggregate Employees sign-off is
claimed.

## EMP-EMPLOYEE-TAGS-001: Employee Tags many-to-many relation (2026-09-21)

Odoo exposes `hr.employee.category_ids` as the HR-user-only Tags field and
renders it with the `many2many_tags` widget in the employee form. Core3 had no
durable employee tag catalog or relation lifecycle. This slice adds the
replay-safe deterministic `employee_tags`/`employee_tag_rel` migration, the
separate employee-detail API datasource/options and add/remove actions, and a
Tags notebook tab with a line-item assignment grid.

The add/remove actions require `employees.write`, an authenticated actor, an
active employee in the current company, a supported non-duplicate tag, and
the parent employee row version. Reads use `employees.read` and the same
company boundary. Focused verification is **7 tests / 45 assertions** when
including the existing Work-tab contract test; the tag test itself covers
CRUD, guard rejection, migration replay, and file-backed restart.

Authenticated Odoo and Core3 desktop/mobile evidence is under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-TAGS-001/`. Odoo source and the
authenticated employee form were captured, but the selected Odoo fixture has
no populated tag chips. Core3 shows the Tags tab at both viewports; the
authenticated company is `Core3 Demo Company` while deterministic Employees
fixtures are `Core3 Vietnam`, so populated Core3 tag rows are company-guarded
empty. No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-TIMEZONE-001: Employee Timezone settings workflow (2026-09-21)

Odoo defines the tracked `hr.employee.tz` selection and exposes it in the
employee Settings form. Core3 already displayed a legacy `timezone` value,
but had no dedicated source-backed action or create-time validation. This
slice adds replay-safe deterministic timezone normalization, supported-value
options to the employee create contract, and the guarded
`edit_employee_timezone` action in the separate employee-detail API YAML.

The Settings page remains layout-only and joins the API by `page.id`; its
read-only Timezone field is paired with the Employees-write header action.
The action requires an authenticated actor, active current-company employee,
supported timezone, and optimistic employee row version. Focused verification
is **4 tests / 19 assertions**, covering create/update, actor/company/stale/
invalid guards, migration replay, and file-backed restart.

Authenticated Odoo and Core3 desktop/mobile evidence is under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-TIMEZONE-001/`. Runtime or fixture
limitations are recorded there; no aggregate Employees sign-off is claimed.

## EMP-TRIAL-PERIOD-001: Employee Payroll end of trial period (2026-09-21)

Odoo's `hr.version` source defines the manager-only tracked
`trial_date_end` field as End of Trial Period. The supplied base Employee form
source does not render that field in its Payroll view; this is recorded as an
explicit source-view limitation, not treated as an Odoo visual match.

Core3 adds migration `20260922150000-069` with deterministic replay-safe trial
dates on both `employees` and `employee_versions`. The separate employee-detail
API contract adds manager-only `edit_employee_trial_period`, synchronizing the
employee projection and the active Payroll version. The page contract adds the
Payroll Trial Period group and header action, joined by `page.id`.

Guards cover authenticated actor, active/current-company employee, active
Payroll version, ISO date format, contract start/end ordering, and optimistic
employee row-version concurrency. Focused verification is **4 tests / 21
assertions**, including migration replay and file-backed restart.

Authenticated Odoo and Core3 desktop/mobile captures are under
`evidence/employees/2026-09-21/EMP-TRIAL-PERIOD-001/`. Odoo shows the
surrounding Payroll form but no Trial Period control because the source view
omits it. Core3 loads the paired Trial Period group, but the authenticated
company is `Core3 Demo Company` while deterministic fixtures are `Core3
Vietnam`, so populated values and the manager action are not visible in that
session. No aggregate Employees sign-off is claimed.

## EMP-EMPLOYEE-AVATAR-001: Employee avatar/image lifecycle (2026-09-21)

Odoo's Employee form renders `image_1920` with the `image` widget, zoom, a
128x158 preview, and the `avatar_128` preview field. Core3 previously exposed
`image_url` only as a read projection and had no durable avatar action.

This slice adds migration `20260922160000-070`, which creates
`employee_avatar_assets`, seeds one deterministic inline SVG fixture, and
projects the authenticated `/api/employees/avatars/<id>` image URL. The
separate employee-detail API YAML declares an `employee_avatar` datasource,
`upload_employee_avatar` upload mutation, and `remove_employee_avatar`
mutation. Both writes require an authenticated actor, active/current-company
employee, and optimistic row-version; upload additionally validates image MIME
and size. The page YAML joins the API by `page.id`, binds `avatar_field` with a
name fallback, and exposes the upload/remove actions.

Focused verification is **4 tests / 25 assertions**, including restart
persistence and atomic guard boundaries. Browser artifacts are under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-AVATAR-001/`. Core3 authenticated
desktop/mobile captures have no request/page failures or overflow, but the
session company is `Core3 Demo Company` while deterministic fixtures are
`Core3 Vietnam`. Odoo desktop/mobile comparison is blocked by rejected local
credentials. No aggregate Employees sign-off is claimed.
## EMP-EMPLOYEE-ATTACHMENTS-001: Employee attachment lifecycle (2026-09-21)

Odoo's `hr.employee` model inherits `mail.thread.main.attachment` in
`/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py:40`, and the
source Employee form renders a chatter at
`/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml:413`.
This slice maps that source-backed attachment surface, without conflating it
with the completed avatar or identity-document slices.

Core3 adds migration `20260922170000-071`, creating durable
`employee_attachments` metadata/content and a deterministic inline handbook
fixture. The separate employee-detail API YAML declares the attachment
datasource and upload/download/remove actions; page YAML only binds the
Attachments panel and action IDs by `page.id`.

Writes require an authenticated actor, `employees.write`, an active employee
in the current company, valid filename/size, and optimistic parent/line row
versions. Duplicate active filenames and invalid attachment/company/actor
references reject atomically. Focused verification is **4 tests / 26
assertions**, including migration replay and file-backed restart persistence.

Authenticated Core3 desktop/mobile evidence is under
`evidence/employees/2026-09-21/EMP-EMPLOYEE-ATTACHMENTS-001/`.
The Core3 session rendered the panel at 1440x900 and 390x844 with no request
or page errors and no horizontal overflow, but its authenticated company is
`Core3 Demo Company` while the deterministic fixture is `Core3 Vietnam`.
The available local Odoo credential was rejected at both viewports, so the
Odoo comparison remains an explicit blocker and no aggregate sign-off is
claimed.

## EMP-EMPLOYEE-RELATED-CONTACTS-001: Employee related contacts workflow (2026-09-21)

Odoo's `hr.employee` source defines `action_related_contacts` and computes the
related partner set as `work_contact_id | user_id.partner_id` in
`/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py:952-976`. The
inherited Employee form adds the `Contacts` smart button and
`related_partners_count` at
`/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml:619-630`.

Core3 adds migration `20260922180000-072`, a durable `employees.work_contact_id`
relation, and a deterministic `base_contacts` person fixture. The API YAML
owns the scoped related-contact datasource, contact options, guarded set/clear
mutation, and navigation action. The page YAML owns only the Contacts stat
button, Work Contact projection, and action binding by `page.id`.

The write workflow requires `employees.write`, an authenticated actor, an
active employee in the current company, an active person contact mapped to the
employee company, and optimistic row-version concurrency. Focused verification
is **4 tests / 23 assertions**, including migration replay and file-backed
restart. Odoo credentials were rejected at both viewports. Core3 browser
discovery is blocked by the unrelated committed Surveys schema error; no
aggregate Employees sign-off is claimed.
