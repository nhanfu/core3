# Employees UI parity

Status: ready

## Reference gate

- Odoo addon/version: `hr`, Odoo 19 Community (`19.0-2` in the live
  environment).
- Source manifest: `/home/nhanjs/projects/odoo/addons/hr/__manifest__.py`.
- The addon is an application and depends on `base_setup`, `digest`,
  `phone_validation`, `resource_mail`, and `web`. It declares official demo
  data in `data/hr_demo.xml`.
- Authenticated live check on 2026-09-10 against the personal reference
  database `core3_personal` reports `ir.module.module(name=hr).state=installed`
  with demo data enabled. The installed reference contains 21 employees and 7
  departments; this supersedes the earlier `core3_demo` fallback observation.
- Reference URL: `http://localhost:8069`. Credentials remain outside this
  document's implementation contracts.

## Live routes and evidence

Odoo action paths explicitly declared by the source are `/odoo/employees`,
`/odoo/all_activities`, and `/odoo/departments`. Actions without a `path`
must be reached through their authenticated menu/action, not guessed from a
URL. The personal installed reference loaded all three routes at both target
viewports with seeded records and no page-level horizontal overflow. Optional
uninstalled addons referenced by the Employees application still produce
expected icon 404s in the Odoo shell and are not treated as Employees failures.

Authenticated installed-reference captures, kept outside Git:

- Employees: `/tmp/odoo-employees-employees-desktop-personal.png` and
  `/tmp/odoo-employees-employees-mobile-personal.png`
- Departments: `/tmp/odoo-employees-departments-desktop-personal.png` and
  `/tmp/odoo-employees-departments-mobile-personal.png`
- All activities: `/tmp/odoo-employees-activities-desktop-personal.png` and
  `/tmp/odoo-employees-activities-mobile-personal.png`

The broader form/configuration captures below remain future evidence; absent
files must not be invented:

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
  positions, contract templates, activity plans, settings, and all their
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

The bounded action-mode batch adds service-owned All activities and Departments
routes, visible List/Kanban/Cards/Activity/Graph/Pivot tabs where the source
action provides them, deterministic activity slots, department counts, and
permissioned department creation/detail contracts. The authenticated Core3
matrix verified Employees, Directory, All activities, and Departments at
1440x900 and 390x844 with no unexpected responses or horizontal overflow.
Captures are under `/tmp/core3-employees-*-avatar.png` and are local evidence
only. A shared optional avatar contract was then added to Kanban/Card views;
Employees and Directory use `image_url` with deterministic initials fallback,
which preserves the Odoo left-photo geometry when no local binary asset is
available.

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
| `/employees/activity-plans` | Onboarding / Offboarding | list/kanban/form plus launch wizard |
| `/employees/contract-templates` | Contract Templates | manager list/form |
| `/employees/settings` | Settings action | HR settings form, system gate |
| `/employee-analysis` | employee graph/pivot | preserve existing alias; route to the employee action analysis modes |

Working Schedules, Employee Tags, Contract Types, and payroll/version detail
integrations must be explicit scoped routes or documented redirects with their
permission/inactive reason; they must not disappear silently.

## Acceptance

- Source and manifest checks identify `hr`, version, dependencies, official
  `hr_demo.xml`, and the installed personal reference state. The gate never
  treats old Discuss fallback screenshots as Employees reference evidence.
- Inventory checks map every visible menu/action/view above, including group
  boundaries, source routes, launch/create/archive/wizard actions, and hidden
  technical/inactive entries.
- Authenticated browser checks navigate from the Odoo Employees menu in the
  installed personal demo database at 1440x900 and 390x844, capture each
  completed state, and assert title, action, records, no page-level horizontal
  overflow, and usable mobile controls. The three installed route pairs above
  are complete; the broader form/configuration matrix remains open.
- Core3 checks navigate through People/Employees rather than direct URLs and
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
