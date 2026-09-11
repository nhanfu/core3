# Employees UI parity

Status: ready

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
