# Odoo 19 UI parity — Maintenance

Status: in-progress

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
  database `core3_reference`, and the local reference credentials recorded in
  the execution handoff. The server answered and `ir.module.module` reports
  `maintenance: state=installed, demo=true, latest_version=19.0.1.0`.
- Authenticated desktop and mobile Maintenance captures exist under `/tmp`.
  They are comparison evidence only and are never committed. The reference is
  local, demo-data dependent, and does not prove unsupported addon behavior or
  parity with other Odoo 19 databases.

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
  and denied user checks prove visibility and mutation boundaries. The current
  local reference is installed with demo data; this plan still does not claim
  full Odoo visual parity for deferred surfaces.

## Focused pre-implementation evidence

Completed for this gate: source manifest/XML/security/demo inspection; Core3
maintenance manifest, pages, migrations, permissions, styles, and package
scripts inspection; authenticated localhost:8069 login and RPC status query;
and authenticated desktop/mobile Maintenance captures in `/tmp`. The local
reference is `core3_reference`, with `maintenance=installed,demo=true`; the
remaining limitation is deferred behavior, not addon availability.

## Implemented slice: equipment Maintenance Requests stat action

Date: 2026-09-11. Implementation commit: `2da0433e`.

This slice closes the visible Odoo equipment-form action that was not present
in the existing Core3 equipment detail: the `Maintenance` stat button. The
button displays the deterministic count of unarchived, non-terminal requests
for the equipment and opens the request action with an `equipment_id` filter.
The request page exposes that filter as an Equipment search facet, so the
selected equipment remains visible after navigation. The action and both
datasources remain in API fragments keyed by their matching `page.id`; page
YAML remains presentation-only.

Implementation files:

- `services/maintenance/api/equipment-detail.yaml` adds the correlated
  `maintenance_open_count`, read-protected navigate action, and explicit 404 /
  503 detail contracts.
- `services/maintenance/api/requests.yaml` adds the equipment predicate,
  stable empty fixture, selected `equipment_id`, and 503 contract.
- `services/maintenance/pages/equipment-detail.yaml` adds the Odoo-form stat
  button; `pages/requests.yaml` adds the Equipment facet.
- `test/maintenance_equipment_requests.integration.test.ts` covers page/API
  joins, deterministic count and filtered rows, idempotent DuckDB migration,
  empty/not-found/transport contracts, and read permissions.

Focused verification:

- `bun test test/maintenance.integration.test.ts test/maintenance_stages.integration.test.ts test/maintenance_equipment_requests.integration.test.ts` — **12 passed, 0 failed, 162 assertions**.
- `bun run audit` — passed, **467 pages / 474 routes / 814 datasources**.
- `bun run lint` from `sdk/bun` — passed.
- `bun run css:build:global && bun run css:build:maintenance` — passed.
- `git diff --check` — passed.

Authenticated browser evidence used the personal Odoo 19 instance at
`http://localhost:8069` and the isolated Core3 runtime at
`http://localhost:3004` (backend `3014`; the requested `3002` was occupied by
another live runtime). Odoo desktop and mobile exercised the stat action; on
mobile the Odoo stat is correctly reached through its overflow action menu.
Core3 desktop and mobile exercised the stat button directly. Every capture is
authenticated, has no page errors or failed requests, and has no document
horizontal overflow (`scrollWidth == clientWidth`). Images are under `/tmp`
only and are not committed.

| Surface/state | Capture | Viewport | SHA-256 |
| --- | --- | --- | --- |
| Odoo equipment detail | `/tmp/odoo-maintenance-equipment-stat-detail-desktop-20260911.png` | 1440x900 | `28a6222590112b38f0945c6dc821adb12d2dc5482d1ad1a493b9ea35705411fd` |
| Core3 equipment detail | `/tmp/core3-maintenance-equipment-stat-detail-desktop-20260911.png` | 1440x900 | `5d3a84d9d9256b439071f917fa8162e705cf2440645b51c00ed0c3ce6c6f9ab1` |
| Odoo filtered requests | `/tmp/odoo-maintenance-equipment-stat-requests-desktop-20260911.png` | 1440x900 | `ea8a805bcb477011d22abeb16cda79c1f61e5bf2c175dec239bccfc1f94229c0` |
| Core3 filtered requests | `/tmp/core3-maintenance-equipment-stat-requests-desktop-20260911.png` | 1440x900 | `506e5a83294390acaf25ae43ff8e217187004b1c046e7254182e3eeac2f83bef` |
| Odoo equipment detail | `/tmp/odoo-maintenance-equipment-stat-detail-mobile-20260911.png` | 390x844 | `4e5da3f5c4776e9551b535c93da1127fd6e18fa79f1b39fc07963a22e31c083d` |
| Core3 equipment detail | `/tmp/core3-maintenance-equipment-stat-detail-mobile-20260911.png` | 390x844 | `c0a1f0bd68f5adc5707944e308aeb88796c0c1fbc738e761e9a4f891ffbf8a1a` |
| Odoo filtered requests | `/tmp/odoo-maintenance-equipment-stat-requests-mobile-20260911.png` | 390x844 | `c150eb85bc3491dddf4c7522c9f71cf5db5c3e5e504389e7f2ffe10517a420df` |
| Core3 filtered requests | `/tmp/core3-maintenance-equipment-stat-requests-mobile-20260911.png` | 390x844 | `5b9a389ecbbf7c665d49d8dc40f8613a7e3589684bda2451a6c1169c5501e304` |

Comparison and fixes:

- The Core3 detail now carries the same visible `1 Maintenance` affordance
  and opens the corresponding request action with a visible `Equipment:
  Acer Laptop` facet. The mobile form and two filtered request cards remain
  readable within 390px.
- The Odoo reference uses its purple backend shell, chatter, richer relational
  widgets, and a centered desktop stat button; Core3 uses the existing Fluent
  shell, two-column static form, and responsive stat card. These are shared
  shell/form differences outside this bounded action and remain documented
  residuals rather than being disguised as pixel parity.
- The Odoo reference record is `HP Laptop` with one active request; Core3’s
  deterministic `Acer Laptop` fixture has one open request plus one Scrap row,
  so the stat count matches while the filtered list density differs. Odoo’s
  desktop kanban and Core3’s desktop kanban are both horizontally dense at the
  edge of a 1440px viewport; Core3’s mobile fallback is card-based and has no
  horizontal overflow.
- Odoo timestamps, avatars, and stage/chatter chrome differ from Core3’s fixed
  fixture values. No browser errors, failed requests, or viewport overflow were
  found in the final pass.
