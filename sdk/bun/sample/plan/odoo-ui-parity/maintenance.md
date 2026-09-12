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

## Bounded batch: Maintenance Activity Types (2026-09-11)

Implementation commit: `55b2166a` (`feat(maintenance): add activity types
parity`). This batch closes the group-restricted Odoo Configuration > Activity
Types action, `mail_activity_type_action_config_maintenance`, reached at
`/odoo/maintenance-activity-types`. The live `core3_codex_demo` reference
showed a six-row list (To-Do, Email, Call, Meeting, Maintenance Request, and
Document), a New action, search, list/kanban controls, and a standard activity
type form.

Core3 adds the menu leaf and normalized service routes
`/maintenance/maintenance-activity-types` and
`/maintenance/maintenance-activity-types/detail`. Page YAML owns the ListView
and OdooFormView presentation; `api/activity-types.yaml` and
`api/activity-type-detail.yaml` own the matching page-id datasources and
mutations. Migration `20260911190000-006-maintenance-activity-types.yaml`
creates deterministic, idempotent fixtures for all six rows. Create, edit,
archive, restore, and delete are protected by `maintenance.settings`; standard
To-Do and Maintenance Request rows cannot be deleted, duplicate names return
409, negative schedules return 422, and updates require row versions.

Focused verification:

- `bun test test/maintenance_activity_types.integration.test.ts` — **3 passed,
  0 failed, 31 assertions**; this covers page/API joins, list/form contracts,
  deterministic ordering, filters, empty/not-found states, permission binding,
  idempotent DuckDB migration, and standard-row guards.
- `bun run audit` — passed, **508 pages / 515 routes / 892 datasources**.
- `bun run lint` from `sdk/bun` — passed.
- `bun run css:build:global && bun run css:build:maintenance` — passed.
- `git diff --check` — passed.

Authenticated browser evidence was captured against Odoo at
`http://localhost:8069` with `codex@core3.local` and against an isolated Core3
runtime at `http://localhost:3016` using `admin@tms.local`. Images remain under
`/tmp` and are not committed:

- Odoo list: `/tmp/odoo-maintenance-activity-types-desktop-1440x900.png` and
  `/tmp/odoo-maintenance-activity-types-mobile-390x844-20260911.png`.
- Core3 list: `/tmp/core3-maintenance-activity-types-desktop-1440x900-20260911.png`
  and `/tmp/core3-maintenance-activity-types-mobile-390x844-20260911.png`.
- Core3 detail: `/tmp/core3-maintenance-activity-type-detail-desktop-1440x900-20260911.png`
  and `/tmp/core3-maintenance-activity-type-detail-mobile-390x844-20260911.png`.

The authenticated Core3 list and detail checks recorded no failed requests or
page errors and no horizontal overflow at 1440x900 or 390x844. Odoo mobile
automatically selects its kanban presentation, while Core3 uses the existing
responsive card fallback; Odoo’s purple shell, activity icons, and richer form
widgets remain shared-shell/rendering residuals rather than page-specific
workarounds. Core3 preserves the six names, summaries, planned delays, and
activity-type form fields.

## Bounded batch: Maintenance Teams delete action (2026-09-12)

The bounded live audit targeted `http://localhost:8073` using the plan
database and credentials. Authentication succeeded, but the active database
reported `maintenance: uninstalled` and its loaded menu tree contained no
Maintenance application entry. Consequently no authenticated Maintenance
menu/action screen could be captured from that reference. The authoritative
Odoo 19 source inventory still identifies Configuration > Maintenance Teams,
`maintenance_team_action_settings`, and `/odoo/maintenance-teams` as the
target action; the source addon XML remains the audit fallback until the
reference database installs Maintenance.

This batch closes the next uncovered team action: deleting a Maintenance Team
from the list row action menu or team form. The action is placed under the
existing Configuration > Maintenance Teams menu and is protected by
`maintenance.manage`. It returns 404 for a missing team, 409 when equipment or
requests still reference the team (with archive guidance), and 409 for a stale
row version. The deterministic Internal Maintenance fixture exercises a
successful delete; Metrology and Subcontractor remain linked fixtures for the
guard. The list remains empty-safe and the detail form exposes the Odoo-style
Delete header action.

Focused verification is recorded by
`test/maintenance_team_delete.integration.test.ts`; captures were attempted
under `/tmp/core3-odoo-parity/maintenance-batch3-20260912/` at 1440x900 and
390x844. The Odoo captures record the authenticated but uninstalled-module
state. Core3 returned an authentication redirect for both viewports, so its
captures are login-shell evidence only and do not claim authenticated feature
parity. Images are temporary comparison evidence and are not committed.

## Bounded batch: Equipment Categories delete action (2026-09-12)

This batch closes exactly one additional source-backed Maintenance action:
deleting an Equipment Category from Odoo's Configuration > Equipment Categories
screen. The source action is `hr_equipment_category_action` at
`/odoo/equipement-categories`, with `list,kanban,form` views. The source model
guard in `addons/maintenance/models/maintenance.py` rejects deletion when
equipment or maintenance requests still reference the category and instructs
the user to archive it instead.

Core3 keeps the existing deliberate normalized route
`/equipement-categories` and detail route `/equipement-categories/detail`, with
the menu/action label and ordering matching the source. Page YAML remains
presentation-only; `api/categories.yaml` and `api/category-detail.yaml` are
joined through `page.id`. The list row menu and the Odoo-style detail header
now expose Delete, protected by `maintenance.manage`. The action returns stable
`MAINTENANCE_CATEGORY_NOT_FOUND` (404), `MAINTENANCE_CATEGORY_IN_USE` (409),
and row-version `STALE_RECORD` (409) responses; authenticated list/detail
boundaries declare 401, 403, 404, and 503 states.

The existing deterministic migration fixtures provide five Odoo-shaped
categories. Computers is linked to active equipment and requests and therefore
exercises the protected-delete guard; Phones is deliberately unlinked and is
deleted successfully in the focused test. Migration execution is repeated to
prove idempotent install/upgrade behavior without changing stable IDs or row
versions.

Implementation and verification:

- `services/maintenance/api/categories.yaml` and `api/category-detail.yaml`
  add the list/detail delete mutations and linked-record guards.
- `services/maintenance/pages/category-detail.yaml` adds the visible Edit /
  Delete header actions; no backend contract is embedded in page YAML.
- `test/maintenance_category_delete.integration.test.ts` covers the exact
  source route/menu binding, CRUD-state reads, default/empty/forbidden/error
  contracts, idempotent fixtures, successful delete, linked 409, missing 404,
  stale 409, and manager permission binding.
- Focused Maintenance suite: **19 passed, 0 failed, 232 assertions**.

Authenticated comparison attempt was bounded to
`/tmp/core3-odoo-parity/maintenance-batch4-20260912/` at 1440x900 and
390x844. The source XML/model audit completed. The local Odoo endpoint was
checked for the exact action, while the Core3 runtime capture is limited to
the authenticated route if the local service is available; images remain
temporary and are never committed. Any unavailable runtime or uninstalled
reference module is recorded as environment evidence, not presented as visual
parity.

## Bounded batch: Equipment Category stat actions (2026-09-12)

This batch closes the two linked actions on Odoo's Equipment Category form:
`hr_equipment_action_from_category_form` ("Equipment") and
`hr_equipment_request_action_link` ("Maintenance"). Both actions are read-only
and preserve the source category context when navigating to the Equipment or
Maintenance Requests action. The category detail now reports active equipment
and open-request counts, and both destination lists expose a Category facet.

The page remains presentation-only. The category detail API owns the aggregate
counts and navigation actions; the Equipment and Requests API fragments own
their category predicates and lookup datasources, joined by matching `page.id`
contracts. Existing fixed fixtures and idempotent migrations are unchanged.
Focused coverage verifies the source action labels and routes, deterministic
counts, filtered equipment and request rows, and an empty category result.

Verification: `bun test ./test/maintenance*.integration.test.ts` from
`sdk/bun/sample` — **23 passed, 0 failed, 263 assertions**. Authenticated
browser capture was attempted under
`/tmp/core3-odoo-parity/maintenance-batch5-20260912/` at 1440x900 and
390x844, but no Core3 screenshots were produced: the local dev runtime hit
`EMFILE` while Vite initialized file watchers and then stopped on DuckDB's
existing migration limitation (`Adding columns with constraints not yet
supported`). The local Odoo endpoint was reachable, but no new authenticated
Maintenance comparison screen was claimed. This is a runtime evidence
limitation, not visual parity evidence.

## Bounded batch: Maintenance Request cancel and reopen (2026-09-12)

This batch closes the Odoo Maintenance Request form actions `Cancel` and
`Reopen Request` from `addons/maintenance/views/maintenance_views.xml`. Odoo
archives a request with Cancel and exposes Reopen Request when the archived
flag is set; the existing Core3 Cancel control incorrectly used the terminal
Scrap workflow transition.

Core3 now exposes page-id-owned archive/reopen mutations in both the request
list and request-detail API fragments. The detail datasource includes the
archived state, and its OdooFormView binds visible `Cancel` and `Reopen
Request` header actions to the matching permission-protected mutations. Both
mutations require a row version, return stable
`MAINTENANCE_REQUEST_NOT_FOUND` (404) and `STALE_RECORD` (409) errors, and
refresh the list/detail sources. The deterministic fixture is archived and
reopened without changing its stable ID or dates.

Implementation and verification:

- `services/maintenance/api/requests.yaml` and
  `api/request-detail.yaml` add the archive/reopen contracts.
- `services/maintenance/pages/request-detail.yaml` binds the source-accurate
  header actions; page YAML remains presentation-only.
- `test/maintenance_request_archive.integration.test.ts` covers page/API
  separation, permissions, deterministic ordering, idempotent DuckDB install
  and upgrade, archive filtering, successful reopen, missing 404, and stale
  409 behavior. The existing statusbar contract test was updated for the new
  visible actions.
- `bun test test/maintenance*.integration.test.ts` from `sdk/bun/sample` —
  **25 passed, 0 failed, 277 assertions**.
- `bun run audit` from `sdk/bun/sample` — passed, **600 pages / 608 routes /
  1034 datasources**.
- `bun run lint` from `sdk/bun` — passed.
- `bun run css:build:global && bun run css:build:maintenance` from
  `sdk/bun/sample` — passed.
- `git diff --check` — passed.

Authenticated browser evidence was attempted with an isolated
`bun run dev --db=ddb --memory` runtime. Startup failed before readiness on the
existing DuckDB migration parser limitation, `Adding columns with constraints
not yet supported`, so `http://127.0.0.1:3001` and `:3002` returned no
response. The persistent Playwright interactive surface required by the
browser QA procedure was not available in this session, and no desktop or
mobile screenshots are claimed or added. The local Odoo source was inspected
at `/home/nhanjs/projects/odoo`; no new authenticated Odoo comparison capture
was made in this batch.

## Bounded batch: Maintenance Request kanban state (2026-09-12)

This batch closes one visible request view gap: Odoo’s `maintenance.request`
form and kanban views expose `kanban_state` as a `state_selection` widget. The
source form places it in the sheet (`maintenance_views.xml:95`), the kanban
footer renders the same widget (`maintenance_views.xml:176-181`), and the
model defines the exact values `normal` / “In Progress”, `blocked` / “Blocked”,
and `done` / “Ready for next stage” (`maintenance.py:223-224`). This is an
independent state from the stage statusbar and is reset to `normal` when the
stage changes (`maintenance.py:331-335`).

Core3 now shows the kanban state on the request kanban card and detail form,
and exposes a page-id-owned `Update kanban state` form action. The API action
updates only `kanban_state`, requires `maintenance.write` and the current row
version, and returns stable 404 not-found, 409 stale-row, and 422 invalid-state
contracts. It accepts only the three source values and uses deterministic
fixtures; no page YAML contains SQL or mutation logic.

Focused verification:

- `bun test test/maintenance*.integration.test.ts` — **27 passed, 0 failed,
  289 assertions**.
- `bun run audit` — passed, **627 pages / 643 routes / 1074 datasources**.
- `bun run lint` from `sdk/bun` — passed.
- `bun run css:build:global && bun run css:build:maintenance` — passed.
- `git diff --check` — passed.

Authenticated browser capture was attempted under
`/tmp/core3-odoo-parity/maintenance-batch6-20260912/` at 1440x900 and
390x844. Core3 failed before readiness because Vite hit `EMFILE: too many open
files` while installing file watchers; both `:3001` and `:3002` then refused
connections. Odoo `:8069` and `:8073` redirected to login, and the installed
workspace does not expose the required persistent Playwright interactive
surface (the fallback Playwright package was also unavailable). Therefore no
authenticated Odoo or Core3 feature screenshots were produced and this batch
makes no visual-parity claim. The runtime/browser limitation is recorded here;
no images were added to Git.
