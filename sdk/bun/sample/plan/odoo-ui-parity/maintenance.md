# Odoo 19 UI parity — Maintenance

Status: ready

This is a plan-only implementation gate. It authorizes a later maintenance
implementation batch; it does not change product code, install Odoo modules,
or claim unavailable visual evidence.

## Reference gate and limitations

- Odoo source: `/home/nhanjs/projects/odoo`, branch `19.0`, revision
  `65975996`; addon `/home/nhanjs/projects/odoo/addons/maintenance`.
- The addon manifest is an application in `Supply Chain/Maintenance`, depends
  on `mail`, includes maintenance views, activity types, settings, security,
  and backend assets, and is installable.
- Authenticated HTTP/RPC audit on 2026-09-10 used `http://localhost:8069`,
  database `core3_demo`, and the local admin account. The server answered and
  authentication succeeded, but `ir.module.module` reports
  `maintenance: state=uninstalled, demo=false, latest_version=false`.
  Consequently no maintenance menu/action records are live in that database,
  and no live maintenance records or demo rows can be used as visual evidence.
- No maintenance-specific desktop or mobile screenshot file exists under
  `/tmp` (checked by filename search). Do not cite a screenshot path until the
  addon is installed in the reference database and an authenticated desktop
  and mobile capture is actually produced. The absence is a reference
  limitation, not a reason to fabricate captures or mark parity complete.

## Source menu, action, route, and view inventory

The source XML is `addons/maintenance/views/maintenance_views.xml`, with
settings in `res_config_settings_views.xml` and activity configuration in
`mail_activity_views.xml`. Odoo web action paths are client action routes, not
Python HTTP endpoints.

| Visible or linked surface | Source menu/action | Source route | Required source views |
| --- | --- | --- | --- |
| Dashboard / Maintenance Teams | `menu_m_dashboard` / `maintenance_dashboard_action` | `/odoo/maintenance` | `kanban, form` |
| Maintenance Requests | `menu_m_request_form` / `hr_equipment_request_action` | `/odoo/maintenance-requests` | `kanban, list, form, pivot, graph, calendar, activity` |
| Maintenance Calendar | `menu_m_request_calendar` / `hr_equipment_request_action_cal` | `/odoo/maintenance-calendar` | `calendar, kanban, list, form, pivot, graph, activity` |
| Equipment | `menu_equipment_form` / `hr_equipment_action` | `/odoo/equipments` | `kanban, list, form` |
| Maintenance request reporting | `maintenance_request_reporting` / `maintenance_request_action_reports` | `/odoo/maintenance-requests-analysis` | `graph, pivot, kanban, list, form, calendar, activity` |
| Maintenance Teams | `menu_maintenance_teams` / `maintenance_team_action_settings` | `/odoo/maintenance-teams` | `list, kanban, form` |
| Equipment Categories | `menu_maintenance_cat` / `hr_equipment_category_action` | `/odoo/equipement-categories` | `list, kanban, form` |
| Settings | `menu_maintenance_config` / `action_maintenance_configuration` | generated settings action | `form` |

The source also defines these menu entries and linked actions, which must be
represented as deliberate supported, deferred, or hidden outcomes: Reporting
children `Overall Equipment Effectiveness (OEE)` and `Losses Analysis` have no
action in the supplied addon; `Maintenance Stages` uses
`hr_equipment_stage_action` at `/odoo/maintenance-stages` and is
`base.group_no_one`; `Activity Types` uses
`mail_activity_type_action_config_maintenance` at
`/odoo/maintenance-activity-types` and is `base.group_no_one`; and equipment
and category stat buttons open filtered maintenance-request/equipment actions.
The dashboard embeds team-scoped To Do, preventive, corrective, unscheduled,
and request-count links; preserve those context/domain variants.

## Source behavior and interaction contract

- Requests: search by request/category/responsible/equipment/owner/stage/team;
  filters My Maintenances, To Do, Done, Blocked, Ready, High-priority,
  Unscheduled, request/schedule/close date, unread messages, activity dates,
  Active, and Cancelled; group by responsible, category, stage, and creator.
  Support create/edit, archive/cancel, reopen, clickable stage statusbar,
  kanban state (in progress/blocked/ready), priority, assignment, recurrence,
  notes/instructions, chatter, activities, and equipment/category links.
- Equipment: search name/model/serial/vendor reference; filters My Equipment,
  Assigned, Unassigned, Under Maintenance, unread/activity dates, Archived;
  group by technician, category, owner, vendor, and properties. Support
  kanban/list/form, color, archive, owner/technician/team/category, vendor and
  product information, serial/model/warranty/cost, maintenance statistics,
  description, chatter, activities, and the open-maintenance stat button.
- Teams and categories: searchable list/kanban/form CRUD, archive behavior,
  equipment/request counts, team dashboard cards, and linked filtered actions.
- Reporting: graph/pivot measures and groupings over request stage,
  responsible, duration, and color, plus list/kanban/calendar/activity parity;
  retain empty, loading, error, and no-permission states.
- Settings: Odoo full-width settings layout, content-only scrolling, and the
  manager-only Custom Worksheets / `module_maintenance_worksheet` upgrade
  boolean. No breadcrumb or horizontal gutter should be introduced.
- Mobile must expose usable action menus/forms, responsive kanban/list choices,
  no horizontal page overflow, and preserved filters/status/actions. Desktop
  acceptance uses a deterministic 1440x900 viewport; mobile uses 390x844 with
  touch emulation. Captures are required only after a real authenticated
  reference session exists.

## Official demo data and deterministic Core3 fixtures

The manifest declares `data/maintenance_demo.xml` as official demo data. It
seeds stages New Request, In Progress, Repaired, and Scrap; teams Metrology and
Subcontractor; categories Computers, Software, Printers, Monitors, and Phones;
equipment such as Samsung Monitor 15", Acer Laptop, HP Laptop, and HP Inkjet
printer; and requests Resolution is bad, Some keys are not working, Motherboard
failed, Battery drains fast, and Touchpad not working. The source also includes
manager/demo owners, technicians, serials, models, colors, dates, and team
links. `data/maintenance_data.xml` supplies the standard stages and activity
subtype/type data. These are reference fixtures, not a license to copy
time-dependent values into Core3.

The existing Core3 service is `sdk/bun/sample/services/maintenance` with
manifest menu entries for Requests, Equipment, and Analysis; permissions
`maintenance.read`, `maintenance.write`, and `maintenance.manage`; two tables;
request workflow transitions; and one equipment/request demo row. Its current
slice is intentionally smaller than Odoo and page YAML owns SQL. The
implementation batch must:

- move all backend datasources, mutations, lookups, and workflow operations to
  convention-discovered `services/maintenance/api/` fragments keyed by
  `page.id`; keep page YAML presentation-only and do not add those fragments to
  a frontend `pages:` manifest;
- replace `CURRENT_DATE`, `CURRENT_TIMESTAMP`, `gen_random_uuid()`, and
  `CURRENT_DATE + INTERVAL` fixture behavior with stable IDs and seeded date
  `2026-01-15`, deterministic ordering, and idempotent migrations for DuckDB
  and supported adapters; prove fresh install and upgrade;
- model requests, equipment, teams, categories, stages, companies, followers,
  activities, attachments/instructions, recurrence, archived rows, and
  statistical fields needed by the source views. Keep the service database
  boundary: cross-service lookups must be declared service operations, never
  cross-service SQL;
- provide stable non-empty fixtures plus a deliberately empty result for each
  list/report route, multiple states (new/in progress/repaired/scrap,
  blocked/ready/unscheduled), active/archived rows, assigned/unassigned users,
  teams/categories, recurrence, activities, chatter, and multi-company cases;
- expose permission-aware, deterministic responses for read/write/manager,
  settings, activity, archive/reopen, attachment/instruction, and
  cross-company access, including explicit 401/403/404/409/422 cases;
- cover create/edit/archive/reopen, status transitions, assignment, recurrence,
  category/team/equipment links, activity scheduling/completion, settings
  update, and row-version conflict guards. Invalid transitions and deleting a
  category/team with linked records must return stable errors;
- extend shared `ListView`, `Kanban`, `OdooFormView`/`FormView`, `Calendar`,
  `Activity`, `Pivot`, `Chart`, `StatRow`, statusbar/status chips, chatter,
  activity, search/filter/group-by, optional columns, dialogs, many2one,
  properties, archive, responsive overflow, and `SettingsView` primitives
  before introducing maintenance-specific renderers. The missing generic
  primitive/API contract must be planned before any page-specific workaround.

## Permissions and workflows

Mirror the source `maintenance.group_equipment_manager` and record rules:
ordinary internal users can read records they own, follow, or are responsible
for and cannot create/manage equipment, categories, teams, or stages; the
Equipment Manager can read/write/create/delete those records and sees all
maintenance records; manager-only settings and activity-type configuration
must remain protected. Apply company scope to request, equipment, team, and
category records. The Core3 permission names may remain the public contract,
but their server enforcement must match these boundaries.

The source request lifecycle is stage-driven and includes archive/cancel and
reopen, not merely the current Core3 New → Assigned → In Progress → Repaired /
Cancelled approximation. Plan an explicit mapping for New Request, In Progress,
Repaired, Scrap, blocked/ready kanban state, and archive, with guards,
permissions, row versions, and audit/chatter events on every mutation.

## Acceptance gate

The implementation batch is complete only when all of the following are
evidenced:

- source inventory above is mapped to Core3 routes, or each unsupported/Odoo
  source entry has a written deliberate defer/hidden decision; dashboard
  context links, stat buttons, group-restricted stages/activity types, and the
  action-only OEE/Losses entries are checked separately;
- fresh install and upgrade pass for DuckDB and supported adapters, migration
  data is idempotent, all request/equipment reads are service-owned API calls,
  and no page YAML contains backend SQL or random/current-time fixtures;
- focused YAML/discovery/service tests verify every datasource/action permission,
  workflow guard, state transition, empty state, deterministic ordering,
  401/403/404/409/422 behavior, company scope, archive/reopen, CRUD, activities,
  and settings update; run the relevant maintenance test file(s), the module
  discovery/audit, YAML validation, CSS build, and `git diff --check`;
- authenticated Playwright navigation from the Core3 Maintenance menu checks
  desktop and mobile routes, search, filters, group-by, list/kanban/form/
  calendar/activity/pivot/graph switches, row/detail navigation, create/edit,
  each valid and invalid workflow action, settings, permissions, empty/error
  states, responsive overflow, and browser network failures. Capture only real
  authenticated Odoo reference screenshots and Core3 verification screenshots
  under explicitly recorded `/tmp` paths;
- ordinary user, Equipment Manager, system/settings user, another company,
  and denied user checks prove visibility and mutation boundaries. No claim of
  Odoo visual parity is made while the reference addon remains uninstalled.

## Focused pre-implementation evidence

Completed for this gate: source manifest/XML/security/demo inspection; Core3
maintenance manifest, pages, migrations, permissions, styles, and package
scripts inspection; authenticated localhost:8069 login and RPC status query;
and `/tmp` maintenance screenshot filename audit. The reference limitation is
recorded precisely above. Product implementation and product-code tests are
out of scope for this plan-only change.
