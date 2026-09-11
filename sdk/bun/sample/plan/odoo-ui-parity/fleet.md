# Odoo 19 UI parity — Fleet

Status: in progress; vehicle, Odometers, Contracts, Manufacturers, Models,
Vehicle Status, and the Services checkpoint below are implemented in isolated worktrees, with
remaining Fleet surfaces explicitly deferred below.

This plan remains the source of truth for the complete Fleet parity scope.
The Models checkpoint is recorded in `odoo-ui-parity/fleet-batch-5.md`; the
latest Services checkpoint is recorded below.

## Reference gate and limitation

- Odoo source is `/home/nhanjs/projects/odoo` at revision
  `659759969d535d286b656c96b675e4612b925ddd` (`65975996`), addon
  `/home/nhanjs/projects/odoo/addons/fleet`.
- `fleet/__manifest__.py` declares name `Fleet`, version `0.1`, category
  `Human Resources/Fleet`, application/installable `True`, dependencies `base`
  and `mail`, backend assets `fleet/static/src/**/*`, normal data files for
  security/views/configuration, and official demo data
  `data/fleet_demo.xml`. The manifest also loads the fleet data, mail subtype,
  activity type, car-brand/model and vehicle-mail wizard definitions.
- Authenticated audit on 2026-09-11 used `http://localhost:8069`, database
  `core3_codex_demo`, login `codex@core3.local`, and password
  `Core3Odoo2026!`. Authentication succeeded as the database administrator.
  SQL returned `fleet|installed|t|19.0.0.1` from `ir_module_module`, proving
  Fleet is installed with demo data in the requested live reference database.
- Authenticated Fleet reference captures are present under `/tmp` and are
  deliberately not committed: the earlier vehicle/Odometer captures above
  plus the Services captures recorded in the checkpoint below. The earlier
  Contracts captures remain historical evidence from the owned reference.

## Source menu, action, route, and view inventory

Odoo Fleet uses the web client action router: these are action/menu contracts,
not independent Python HTTP endpoints. The implementation should expose the
listed Core3 route aliases while preserving action identity and view order.
The source XML is `views/fleet_vehicle_views.xml`,
`views/fleet_vehicle_model_views.xml`, `views/fleet_vehicle_cost_views.xml`,
`views/fleet_board_view.xml`, `views/fleet_vehicle_odometer_report.xml`,
`views/mail_activity_views.xml`, and `views/res_config_settings_views.xml`.

| Menu / source action | Model and source view mode | Core3 route alias to implement | Visibility |
| --- | --- | --- | --- |
| Fleet > Fleet / `fleet_vehicle_action` | `fleet.vehicle`; `kanban,list,form,pivot,activity` | `/vehicles` | `fleet_group_user` |
| Fleet > Odometers / `fleet_vehicle_odometer_action` | `fleet.vehicle.odometer`; `list,form,graph` | `/fleet/odometers` | `fleet_group_user` |
| Fleet > Contracts / `fleet_vehicle_log_contract_action` | `fleet.vehicle.log.contract`; `list,kanban,form,graph,pivot,activity`; context `search_default_open=1` | `/fleet/contracts` | `fleet_group_user` |
| Fleet > Services / `fleet_vehicle_log_services_action` | `fleet.vehicle.log.services`; `list,kanban,form,graph,pivot,activity`; context `search_default_groupby_service_type_id=1` | `/fleet/services` | `fleet_group_user` |
| Fleet > Reporting > Costs / `fleet_costs_reporting_action` | `fleet.vehicle.cost.report`; `graph,pivot`; context `search_default_filter_date_start=1` | `/fleet/reporting/costs` | `fleet_group_manager` |
| Fleet > Reporting > Odometers / `fleet_vehicle_odometer_reporting_action` | `fleet.vehicle.odometer.report`; `graph`; domain active vehicles; group date and category by default | `/fleet/reporting/odometers` | `fleet_group_manager` |
| Fleet > Configuration > Models > Manufacturers / `fleet_vehicle_model_brand_action` | `fleet.vehicle.model.brand`; `kanban,list,form`; context `search_default_with_models=1` | `/fleet/config/manufacturers` | `fleet_group_manager` |
| Fleet > Configuration > Models > Models / `fleet_vehicle_model_action` | `fleet.vehicle.model`; `list,form`; context group by brand | `/fleet/config/models` | `fleet_group_manager` |
| Fleet > Configuration > Models > Categories / `fleet_vehicle_model_category_action` | `fleet.vehicle.model.category`; `list` (form is available for CRUD) | `/fleet/config/model-categories` | `fleet_group_manager` |
| Fleet > Configuration > Settings / `fleet_config_settings_action` | `res.config.settings`; `form`; context `module=fleet, bin_size=false` | `/fleet/config/settings` | `base.group_system` |
| Fleet > Configuration > Services > Types / `fleet_vehicle_service_types_action` | `fleet.service.type`; `list,form`; context group by category | `/fleet/config/service-types` | `base.group_no_one` |
| Fleet > Configuration > Vehicle > Status / `fleet_vehicle_state_action` | `fleet.vehicle.state`; `list,form` | `/fleet/config/statuses` | `base.group_no_one` |
| Fleet > Configuration > Vehicle > Tags / `fleet_vehicle_tag_action` | `fleet.vehicle.tag`; default/list action with form/tree definitions | `/fleet/config/tags` | `base.group_no_one` |
| Fleet > Configuration > Activity Types / `mail_activity_type_action_config_fleet` | `mail.activity.type`; `list,kanban,form`; domain global or `fleet.vehicle.log.contract`, default model contract | `/fleet/config/activity-types` | `base.group_no_one` |

The root `Fleet` menu (`menu_root`) is application-visible to
`fleet_group_user`; `Configuration` (`fleet_configuration`) is manager-only;
`Reporting` (`menu_fleet_reporting`) is manager-only. The source also exposes
the vehicle form stat buttons: Drivers History (`open_assignation_logs`),
Contracts, Services (normal/overdue/today variants), and Odometer. They open
the corresponding filtered actions and are part of the form contract, even
though they are not separate menus.

### View contracts and interaction states

- `fleet.vehicle`: form `fleet_vehicle_view_form` with clickable `state_id`
  statusbar, Apply New Driver, archive ribbon, stat buttons, avatar/image,
  many2many tags, Driver and Vehicle groups, vehicle properties, Tax Info,
  Model, Note tabs, and chatter; list `fleet_vehicle_view_tree` with
  multi-edit, optional columns, badges, activity decoration and contract
  warnings; quick-create form; kanban; activity; and pivot. Search fields are
  Vehicle/name or plate, Drivers/history, Model, License Plate, Tags, Status,
  and Properties. Filters are Available, Bikes, Cars, Trailer Hook, Planned
  for Change, Need Action, Archived, and activity-date filters. Group by Model,
  Brand, Status, Fuel Type, and Properties.
- `fleet.vehicle.model`: list/form plus grouped-by-brand default, kanban,
  search, model fields for brand/category/type/year/seats/doors/color,
  trailer/electric options, fuel/transmission/drive/power/range/CO2 and
  vendor contact; model count and image states must be visible.
- `fleet.vehicle.model.brand`: kanban/list/form/search with active/archive,
  image, name and model count. `fleet.vehicle.model.category`: list/form with
  sequence and name.
- `fleet.vehicle.log.contract`: list/kanban/form/graph/pivot/activity with
  open-by-default search, active/expired state, vehicle, insurer/purchaser,
  cost subtype, dates, amount, generated-cost and recurrence fields.
- `fleet.vehicle.log.services`: list/kanban/form/graph/pivot/activity grouped
  by service type by default; service type, vehicle, vendor/purchaser, date,
  odometer, amount, invoice reference, notes, currency and state.
- `fleet.vehicle.odometer`: list/form/graph/search with date, vehicle, driver,
  value and unit; report graph groups active vehicle mileage by date/category.
- Cost reporting: graph/pivot first, with searchable list/form support from
  the report view (`date_start`, `cost_type`, `vehicle_id`, `driver_id`, fuel,
  company and cost). Empty analysis must say there is no data.
- Configuration: service type, status, tag, model, manufacturer/category,
  activity type and settings forms/lists must preserve create/edit/archive
  affordances and group restrictions. Fleet settings contains one manager
  setting: `delay_alert_contract`, the number of days before contract end to
  send an alert. Settings follows the full-width Odoo settings convention:
  no breadcrumb or horizontal content gutter; only content scrolls.

## Services checkpoint: `fleet_vehicle_log_services_action`

Source inspection on 2026-09-11 used the live personal database. Odoo menu id
156 (`Fleet / Services`, parent menu 147) opens action id 182,
`fleet_vehicle_log_services_action`, model `fleet.vehicle.log.services`, with
view order `list,kanban,form,graph,pivot,activity` and context
`search_default_groupby_service_type_id=1`. The live action exposes the
`Services` label, the `Service Type` default grouping, six `Done` demo logs,
the columns Date, Description, Service Type, Vehicle, Driver, Vendor, Notes,
Cost, and Stage, and the form fields Description, Service Type, Date, Cost,
Vendor, Vehicle, Driver, Odometer Value, Unit, and Notes.

Checkpoint commit: `8bc316dd` (`feat(fleet): add services logs parity slice`)
plus visual correction commit `6725a8c9` (`fix(fleet): open service logs as
full forms`). Core3 exposes `/fleet/services` and
`/fleet/services/detail`; page YAML is presentation-only and the API fragments
`services.yaml` and `service-detail.yaml` join by `page.id`. Migrations
`20260911190000-011-fleet-services-schema.yaml` and
`20260911191000-012-fleet-services-data.yaml` provide idempotent service type
and service-log tables with the fixed reference date `2026-01-15`. The six
default logs are all `Done` and grouped under `Repair and maintenance` to
match the installed Odoo reference; New, Running, Cancelled, and Archived
states are available through deterministic mutation tests and guarded actions.

Supported in this bounded slice: Odoo list/kanban/form/graph/pivot/activity
declarations; default Service Type grouping; search; service-type and vehicle
filters; group-by Fleet Manager, Model, and Manufacturer; list/detail
navigation; manager-only create/edit; relation and value validation; New to
Running to Done and cancellation/reset guards; archive/restore; protected
active delete; stale row-version rejection; and explicit empty, not-found,
transport-error, 401/403 permission, 404 relation, 409 conflict, and 422
validation contracts. Ordinary Fleet users retain read access while the
mutations use the manager permission, matching the installed access CSV.

Authenticated comparison captures, deliberately excluded from Git:

- Odoo personal desktop list: `/tmp/odoo-personal-fleet-services-desktop-list-final-20260911.png` (1440x900)
- Odoo personal mobile list: `/tmp/odoo-personal-fleet-services-mobile-list-final-20260911.png` (390x844)
- Odoo personal desktop detail: `/tmp/odoo-personal-fleet-services-desktop-detail-final-20260911.png` (1440x900)
- Odoo personal mobile detail: `/tmp/odoo-personal-fleet-services-mobile-detail-final-20260911.png` (390x844)
- Core3 desktop list: `/tmp/core3-fleet-services-desktop-list-final-20260911.png` (1440x900)
- Core3 mobile list: `/tmp/core3-fleet-services-mobile-list-final-20260911.png` (390x844)
- Core3 desktop detail: `/tmp/core3-fleet-services-desktop-detail-final-20260911.png` (1440x900)
- Core3 mobile detail: `/tmp/core3-fleet-services-mobile-detail-final-20260911.png` (390x844)

The authenticated browser pass found no failed responses, page errors, or
horizontal overflow on the Core3 list/detail routes and the Odoo reference
captures. Known visual limits are the Fluent Core3 shell versus Odoo's purple
shell, Core3's local vehicle names and absence of Odoo vehicle/driver images,
ISO dates versus Odoo's localized dates, and the bounded form's placeholder
Messages and activities area rather than native chatter/activity composition.
The activity view and richer many2one/avatar behavior are declared for the
screen contract but remain deferred shared-primitive work.

## Model Categories checkpoint: `fleet_vehicle_model_category_action`

The installed personal Odoo database exposes Fleet > Configuration > Models >
Categories as menu id 146 and action id 174 (`fleet_vehicle_model_category_action`).
The action is `fleet.vehicle.model.category`, list-only in the action contract,
with inline sequence handles and editable `Name`; the installed demo contains
10 deterministic rows in sequence order: Sedan, Estate, Compact, SUV, Coupe,
Convertible, MPU, BMX, VTT, and City. The source also defines a form view for
the same model. Fleet users have read access, while Fleet managers have create,
write, and delete access; the menu itself is manager-only.

Implementation checkpoint: `1ec41142d79a08f6754b8d11a876be19cf94330d`.
Core3 exposes `/fleet/config/model-categories` from the page-id/API pair
`fleet-model-categories`; the page remains presentation-only and
`api/model-categories.yaml` owns the read datasource and guarded mutations.
Migrations `20260911194000-013-fleet-model-categories.yaml` and
`20260911195000-014-fleet-model-categories-data.yaml` add the row-version/index
support and preserve the ten stable category fixtures on fresh install and
upgrade. The list keeps the Odoo handle/name layout at desktop and mobile
breakpoints. Writes require `fleet.manage`; reads require `fleet.read`.

The bounded slice supports deterministic search and empty/transport-error
states; manager-only inline create/update/delete; sequence ordering; blank and
case-insensitive duplicate-name validation; stale row-version rejection;
missing-category 404s; and a relation guard that returns
`FLEET_MODEL_CATEGORY_IN_USE` when a category is referenced by a vehicle model.
The focused test also asserts the menu permission, datasource permission,
page/API join, migration idempotency, live Odoo row volume/order, and every
guarded mutation permission.

Authenticated visual evidence, captured and inspected on 2026-09-11 using the
personal Odoo administrator and the isolated Core3 worktree runtime, is kept
outside Git:

- Odoo desktop 1440x900: `/tmp/odoo-personal-fleet-model-categories-desktop-20260911.png`
  SHA-256 `cc232b2f837ad687e62b8b46629486d57a1c274d8e13ddd3421dab34b9481acd`
- Odoo mobile 390x844: `/tmp/odoo-personal-fleet-model-categories-mobile-20260911.png`
  SHA-256 `6e94d8be8fa6e77ce02a385fe628f504de70d86787056a2222035e006652ad55`
- Core3 desktop 1440x900: `/tmp/core3-fleet-model-categories-desktop-final-20260911.png`
  SHA-256 `6c4addaf231ed01c6e141476e807d97c50c6c5b819f98af70543a57063d00004`
- Core3 mobile 390x844: `/tmp/core3-fleet-model-categories-mobile-final-20260911.png`
  SHA-256 `3ceaf8e77053c284c9efcaa8b882a47bd7f9c20f5d2b5ad4203211154005fd71`

The authenticated browser pass rendered all 10 rows at both viewports with no
page errors, ignored notification-abort noise, and no horizontal overflow
(1440/1440 and 390/390 document widths). The expected shared visual difference
is Core3's Fluent shell versus Odoo's purple shell; the category rows, order,
handle, Name column, New control, pager, search affordance, and responsive
toolbar are represented in both captures. Verification passed with
`bun test test/fleet_model_categories.integration.test.ts` (3 tests, 32
assertions), `bun run audit` (453 pages, 460 routes, 788 datasources), and
`git diff --check`. Evidence documentation checkpoint follows this section.

## Costs Analysis checkpoint: `fleet_costs_reporting_action`

The installed personal Odoo database exposes Fleet > Reporting > Costs as menu
id 158 and action id 183 (`fleet_costs_reporting_action`), named `Costs
Analysis`, model `fleet.vehicle.cost.report`, with `graph,pivot` view order and
context `search_default_filter_date_start=1`. The live report contains 91 rows
across five vehicles for the seeded current-year view; its search contract
includes vehicle/name, driver, date, Service, Contract, and Vehicle/Driver
grouping. The source graph groups by month and cost type with Cost as the
measure; the pivot groups Vehicle by Date and Cost Type.

Implementation checkpoint: `28139df3` (`feat(fleet): add costs analysis parity
slice`). Core3 exposes `/fleet/reporting/costs` from the page-id/API pair
`fleet-costs-analysis`; the page remains presentation-only and
`api/costs-analysis.yaml` owns the manager-only report datasource. Migrations
`20260911210000-015-fleet-cost-report-schema.yaml` and
`20260911211000-016-fleet-cost-report-data.yaml` add stable report rows for
service and contract costs, with the fixed fixture date `2026-01-15`. The
report supports graph/pivot tabs, search, Cost Type filtering, deterministic
ordering, and explicit empty and transport-error states.

Verification passed with `bun test test/fleet_costs_analysis.integration.test.ts`
(2 tests, 27 assertions), `bun run audit` (460 pages, 467 routes, 800
datasources), and `git diff --check`. The focused test proves migration
idempotency, page/API discovery, stable rows, search/filter behavior, empty
data, and the `FLEET_COSTS_DATA_UNAVAILABLE` transport contract.

Authenticated visual evidence, captured and inspected on 2026-09-11 using the
personal Odoo administrator and the isolated Core3 runtime, is kept outside
Git:

- Odoo desktop 1440x900: `/tmp/odoo-personal-fleet-costs-desktop-20260911.png`
  SHA-256 `f69c1b9ee77a5857019aa69ffe229d7d3dece8b52c4eba9858ac179b2df2e3e9`
- Odoo mobile 390x844: `/tmp/odoo-personal-fleet-costs-mobile-20260911.png`
  SHA-256 `978de6afd8a91931e0469a773327575fb750a375c4cb10cbbf853d1ed787c3f0`
- Core3 desktop 1440x900: `/tmp/core3-fleet-costs-desktop-20260911.png`
  SHA-256 `d0ed5e56b2b84b9dbd238c1520f55a234efb7d41518ff41aee3f4413143c87d7`
- Core3 mobile 390x844: `/tmp/core3-fleet-costs-mobile-20260911.png`
  SHA-256 `9f544ba239dc193e1c884a9ce70fb7b1b5e5a8c8b5a2e7b96263928a22bee95c`

The browser pass found no page errors, failed requests, or horizontal overflow
(1440/1440 and 390/390 document widths) on either implementation. The Core3
bar graph matches Odoo's graph-mode affordance and monthly cost-type series;
known bounded visual differences are the Fluent versus purple application
shell, ISO dates and local six-month fixtures versus Odoo's localized nine-
month demo series, and the shared Core3 renderer's grouped bars without
Odoo's stacked total overlay. Pivot mode and richer report grouping remain
shared-renderer follow-up work.

## Source data and behavior contract

The source models are `fleet.vehicle`, `fleet.vehicle.model`,
`fleet.vehicle.model.brand`, `fleet.vehicle.model.category`,
`fleet.vehicle.state`, `fleet.vehicle.tag`, `fleet.service.type`,
`fleet.vehicle.log.contract`, `fleet.vehicle.log.services`,
`fleet.vehicle.odometer`, `fleet.vehicle.assignation.log`,
`fleet.vehicle.cost.report`, and `fleet.vehicle.odometer.report`, plus mail
activities/chatter. Preserve relational fields (company, model/brand/category,
driver/future driver/manager, tags, service type, insurer/vendor/purchaser),
vehicle type car/bike, active/archive, status, contract renewal warnings,
odometer units, currency, and property fields.

Required behavior includes quick create and full create/edit, multi-edit,
archive/unarchive, clickable status changes, apply-future-driver, driver
history, stat-button context/domain propagation, contract/service/odometer
CRUD, recurring contract generation semantics, activity scheduling and
completion, chatter, report grouping/measure changes, and invalid relational
deletion handling. Preserve domains and defaults from the action contexts
rather than merely reproducing labels.

## Official demo data and deterministic Core3 fixtures

`data/fleet_demo.xml` is official manifest demo data. It creates the demo user
group, vehicle states Ordered/Reserve/Waiting List, service types including
repair, refueling, tires, inspection and cost categories, tags Junior/Senior/
Employee Car/Purchased, model categories Sedan/Estate/Compact/SUV/Coupe/
Convertible/MPV/BMX/VTT/City, manufacturers/models, contracts and vehicles.
`data/fleet_data.xml` supplies New Request, To Order, Registered and Downgraded
states plus Omnium and Leasing categories. Use these as semantic reference
fixtures, not as time-sensitive copied records or Odoo IDs.

The current Core3 service is `sdk/bun/sample/services/fleet`: vehicle batch 1
and Odometers batch 2 expose service-owned page-id APIs, stable Fleet vehicle
and odometer fixtures, and the approximate Available/Assigned/Maintenance/
Retired workflow. The remaining implementation batches must:

- move every list/detail/analysis datasource, lookup, mutation and transition
  to convention-discovered `services/fleet/api/` fragments keyed by `page.id`;
  keep page YAML presentation-only and do not add API fragments to a frontend
  `pages:` manifest;
- replace current/random database defaults and `INSERT OR IGNORE` assumptions
  with stable IDs, seeded date `2026-01-15`, deterministic ordering, and
  idempotent DuckDB/Postgres migrations. Prove fresh install and upgrade;
- model vehicles, models, brands, categories, states, tags, companies,
  drivers/managers, assignment history, contracts, services, service types,
  odometers, currencies, activities, attachments/notes, properties, archive
  and report projections. Cross-service employee/user data must use declared
  Auth operations, never cross-service SQL;
- provide stable non-empty and deliberately empty fixtures for every route and
  view mode: cars/bikes, assigned/unassigned/future driver, active/archived,
  each renewal warning, each status, contract/service/odometer rows, grouped
  reports, activities/chatter, multi-company records, and no-data analysis;
- expose deterministic read/write/manage responses and explicit 401/403/404/
  409/422 cases for missing relations, invalid status/vehicle-type transitions,
  stale row versions, protected configuration, cross-company access and
  invalid deletes;
- support source actions and filters with stable query parameters: search,
  Available/Bikes/Cars/Trailer Hook/Planned/Need Action/Archived, activity
  dates, group-by fields, optional columns, pagination and report measures;
  retain action context defaults for open contracts, service-type grouping,
  model grouping and report date/category grouping.

Every screen backend contract must be independently replaceable by a query and
must declare its mock data in that backend datasource. No page YAML may contain
backend SQL, current timestamps, random IDs, or hidden synthetic fallback data.

## Permissions and security

Mirror `fleet_group_user` (“Officer: Manage all vehicles”) and
`fleet_group_manager` (“Administrator”). Ordinary Fleet users can read and
CRUD vehicles, contracts and odometers as permitted by the source access CSV,
but configuration models/tags/states/brands/categories/service types are
read-only; managers can manage configuration and see reporting/settings.
System settings remains protected by `base.group_system`; activity-type and
service/status/tag menus remain `base.group_no_one` exactly as source-restricted
configuration surfaces. Enforce company scope on vehicles, contracts,
services, reports and odometers (`company_id in company_ids + [False]`).
Test ordinary user, Fleet manager, system/settings user, another company and a
denied/no-Fleet user for menu, row, lookup, mutation and report boundaries.

## Shared primitives to schedule before Fleet-specific UI

Reuse or extend shared `ListView`, `Kanban`, `OdooFormView`/`FormView`,
`SearchBar` with filters/group-by/optional columns, `Calendar`/`Activity`,
`Pivot`, `Chart`, `StatRow`, statusbar/status chips, badges and warning
decorations, avatar/image, many2one/many2many tags, properties, notebook tabs,
chatter/activity composer, archive/ribbon, dialogs, multi-edit, report empty
state, responsive table/kanban overflow, and `SettingsView`. Record any
missing generic primitive/API contract before adding a Fleet-specific renderer.

## Acceptance gate

The Fleet implementation batch is complete only when all of these are evidenced:

- source manifest/version/demo and every menu, action, route alias, view mode,
  filter/group-by, form stat action, context/domain and group restriction above
  map to Core3, with a written supported/deferred/hidden decision for every
  unsupported surface;
- fresh install and upgrade pass for DuckDB and supported adapters; migrations
  are idempotent; API fragments are convention-discovered; no page YAML owns
  SQL or unstable fixture values;
- focused YAML/discovery/service tests cover every datasource/action permission,
  deterministic ordering, search/filter/group/pagination, every view mode,
  CRUD/archive, relation lookup, report empty state, activities/chatter,
  company scope and stable 401/403/404/409/422 errors;
- authenticated Core3 Playwright navigation from Fleet checks desktop 1440x900
  and mobile 390x844, every route and mode switch, search/filter/grouping,
  row/detail/stat-button navigation, create/edit/multi-edit/archive, status and
  contract/service/odometer actions, reports, settings, empty/error/loading,
  no horizontal overflow and browser network failures. Capture Core3
  verification screenshots under recorded `/tmp` paths;
- authenticated Odoo reference desktop/mobile captures are recorded for the
  installed personal Fleet database under `/tmp`; they are not committed;
- ordinary Fleet user, manager, system/settings user, other company and denied
  user checks prove menu, row, mutation, configuration and report boundaries.

## Focused pre-implementation evidence

Completed for this gate: pinned Odoo manifest/source XML/security/demo
inspection; action/menu/view-mode and field inventory; Core3 Fleet manifest,
pages, permissions, migrations, storage and styles inspection; authenticated
personal Odoo login and SQL module-status query; authenticated Fleet vehicle and
Odometers desktop/mobile captures; and review of the six register gates. No
product image is part of this change.

## Fleet Configuration > Settings checkpoint (2026-09-11)

The selected uncovered installed visible Fleet action was `Fleet > Configuration >
Settings`. In the requested `core3_codex_demo` database, the authenticated menu audit
on 2026-09-11 found menu id 160 (`Fleet/Configuration/Settings`, sequence 0,
`base.group_system`) opening action id 185,
`fleet_config_settings_action`. The action is a form over `res.config.settings`,
with context `{'module': 'fleet', 'bin_size': False}` and no independent CRUD
records because this is an Odoo transient settings form. It is the first child
of the Configuration menu and must remain before Models, Services, Vehicle, and
Activity Types.

The source contract is pinned to
`/home/nhanjs/projects/odoo/addons/fleet/views/res_config_settings_views.xml`
and `models/res_config_settings.py` at revision `65975996`. The inherited form
adds the `Fleet` settings app (label `Fleet`) and one block titled `Fleet
Management`, containing one setting titled `End Date Contract Alert` with the
exact inline copy `Send an alert [integer] days before the end date`. The field
is `delay_alert_contract`, an integer with Odoo default 30 and config parameter
`hr_fleet.delay_alert_contract`. The value affects contract/vehicle renewal
warning windows, so saving is a real configuration mutation rather than a
display-only fixture.

Implemented Core3 contract:

- Add `/fleet/config/settings` as a `base.system`-equivalent route with a
  page-only YAML layout and a separate API YAML fragment joined by
  `page.id=fleet-settings`; the API owns the single settings datasource and
  update action.
- Mirror the full-width Odoo `SettingsView`: top Save/Discard controls, Settings
  title, settings search, the General Settings tab rail, Fleet Management
  section, and the one integer field with exact visible labels/copy. Omit
  breadcrumbs and horizontal gutters; only settings content may scroll, as
  required for Odoo settings parity. Desktop evidence is 1440x900 and mobile is
  390x844.
- Use permission `fleet.settings` for the page, menu, datasource, and save
  action. It is granted only to the system/settings boundary; ordinary Fleet
  users, Fleet managers without system access, and denied users must receive
  hidden-menu/403 behavior. Keep this distinct from `fleet.manage`.
- Add deterministic, idempotent schema/data migrations for one row
  `fleet-settings-demo`, company `My Company (San Francisco)`,
  `delay_alert_contract=30`, `row_version=1`, and fixed update timestamp
  `2026-01-15 00:00:00`. The datasource must support explicit empty/not-found
  and transport-error fixtures without hidden fallback values.
- The save action must support a valid positive integer update, reject blank,
  non-integer, zero, and negative values with a stable 422 contract, reject a
  missing row with 404, reject a stale row version with 409, and retain the
  previous value on failure. This form has no create/delete/archive or
  workflow transition; those boundaries must be asserted as intentionally
  absent while save/reload is covered.
- Focused integration coverage must assert menu/action/source/view parity,
  page/API discovery, migration idempotency, deterministic fixture data,
  valid save/reload, empty/not-found/transport error, 401/403 permissions,
  and 404/409/422 mutation guards. Authenticated browser coverage must visit
  the route at both required viewports, edit and save the integer, verify the
  updated value, check no horizontal overflow or browser errors, and retain
  Odoo/Core3 screenshots outside Git.

Implementation is deliberately limited to this one Settings action. Service
Types, Vehicle Status, Vehicle Tags, Activity Types, and richer settings
cross-links remain uncovered follow-up slices.

### Settings source comparison and evidence

The live Fleet menu/action audit in `core3_codex_demo` confirmed the complete
Fleet leaf tree before implementation: Fleet (action 175), Odometers (176),
Contracts (181), Services (182), Reporting > Costs (183), Reporting > Odometer
Analysis (186), Configuration > Settings (185), Configuration > Models >
Manufacturers (173), Models (172), Categories (174), Configuration > Services >
Types (177), Configuration > Vehicle > Status (178), Tags (179), and
Configuration > Activity Types (184). Core3 already owned the other implemented
routes; this checkpoint adds only action 185 and does not redo them. The live
action is `res.config.settings`, `form`, context `module=fleet` and
`bin_size=false`; its installed form exposes the Fleet Management block and
the `delay_alert_contract` integer defaulting to 30. The Odoo form also displays
global installed settings categories; those non-Fleet tabs remain delegated to
their module-owned settings actions rather than duplicated in this batch.

Implementation commit: `50b6aa43` (`feat(fleet): add configuration settings parity`).
The page `fleet-settings` is presentation-only apart from its client save
adapter; `api/settings.yaml` owns the datasource and server mutation, joined by
`page.id`. Migrations `20260911230000-019-fleet-settings-schema.yaml` and
`20260911231000-020-fleet-settings-data.yaml` are idempotent and seed the fixed
30-day value. The shared number renderer now emits the inline sentence once,
and the Fleet settings stylesheet switches the mobile rail from the desktop
sidebar to a horizontal tab strip with a full-width search row.

Authenticated captures were taken against `core3_codex_demo` and the isolated
Core3 runtime; screenshots are outside Git and were visually inspected:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Fleet Settings | 1440x900 | `/tmp/odoo-codex-fleet-settings-desktop-20260911-viewport.png` | `73c25d7f16d49b0df3bc70672ad2570e007fb7d8937e62a9a612b607ea26df94` |
| Odoo Fleet Settings | 390x844 | `/tmp/odoo-codex-fleet-settings-mobile-20260911-viewport.png` | `98fad19df7e694f27adfa3be4ebcddec2e2ada78d7a3f67fc8258356a261754b` |
| Core3 Fleet Settings | 1440x900 | `/tmp/core3-codex-fleet-settings-desktop-20260911-viewport.png` | `7ba74b2c538f55abe589fb063bd2d94bf13287ab45e72e33c3518403f42f6bd8` |
| Core3 Fleet Settings | 390x844 | `/tmp/core3-codex-fleet-settings-mobile-20260911-viewport.png` | `2f41aebb46230831f557ab8dd9522459d7f5e75727073a615de513c9b5b50c6a` |

The authenticated browser pass reached `/fleet/config/settings` in Core3 at
both viewports, saved 45 days, reloaded the persisted value, restored the
deterministic 30-day fixture, and reported `requestfailed: []`,
`pageerror: []`, and body/document widths `1440/1440` and `390/390`.
The Odoo action reported the same clean browser/error/width checks. Static
gates passed with focused Fleet Settings tests (4 tests, 34 assertions),
`bun run audit` (489 pages, 496 routes, 853 datasources), ESLint, global and
Fleet CSS builds, and `git diff --check`. The expected bounded differences are
the Core3 Fluent shell versus Odoo's purple shell, Core3's Fleet-only settings
tab versus Odoo's global installed-module category rail, and the shared Core3
settings controls versus Odoo-native widgets.

## Reporting Odometers analysis (2026-09-11)

The installed Odoo source and owned demo database support the separate Fleet
Reporting > Odometers action (`fleet_vehicle_odometer_reporting_action`, action
186). Its source-backed report is manager-visible, defaults to date/category
grouping, and exposes Graph analysis over active-vehicle odometer records. The
owned reference contains populated report rows, so this is implemented as a
bounded report slice rather than a placeholder.

Core3 adds `/fleet/reporting/odometers` with page-only layout YAML and a
page-bound API fragment. The service-owned migration provides 23 deterministic
monthly rows across electric City Bike and petrol Model S fixtures. Search,
vehicle/category/fuel/model filters, date/vehicle/category/fuel/model groupings,
Graph rendering, empty/not-found fixtures, transport error, and manager
permission are explicit. The report is read-only; sequence editing, native
relational pickers, cross-company policy detail, and activity/chatter are
outside this bounded action.

Focused coverage passes 3 tests and 21 assertions. Audit reports 485 pages,
492 routes, and 848 datasources; ESLint, global Sass, and `git diff --check`
pass. Authenticated Core3 browser verification reached the report from the
Fleet surface at both viewports with no failed requests, page errors, or
horizontal overflow. Screenshots remain outside Git:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Odometer Analysis | 1440x900 | `/tmp/odoo-fleet-odometer-analysis-20260911/odoo-desktop-1440x900.png` | `c906be558d571bea916ef337511edad25ad4868d25a3b365f4f1e4aca09f1d51` |
| Core3 Odometer Analysis | 1440x900 | `/tmp/core3-fleet-odometer-analysis-verified-desktop-1440x900.png` | `c58573cfd41eadbbfcb82d50dcc3fc7063c6906eed88865da9c29a9d3965b42d` |
| Core3 Odometer Analysis | 390x844 | `/tmp/core3-fleet-odometer-analysis-verified-mobile-390x844.png` | `8ac3926bd8dfa94caf64c306b5444009154b35c1bc13795cfe7ce32c44aec603` |

The Odoo worker capture is desktop-only; the Core3 mobile capture covers the
responsive report state. Odoo's installed action is Graph-first, while Core3
also uses the shared report list projection for responsive fallback. Date
labels and shell styling retain the documented Core3/Odoo visual differences.

## Configuration > Vehicle > Status checkpoint (2026-09-11)

The selected uncovered Fleet action was `fleet_vehicle_state_action`, reached
from `Fleet > Configuration > Vehicle > Status`. The active reference is
`http://localhost:8069`, database `core3_user_demo`, authenticated as
`admin@core3.local`; the Odoo source is `/home/nhanjs/projects/odoo` at
revision `65975996`. The live menu is action id 760, model
`fleet.vehicle.state`, with `list,form` view order and `base.group_no_one`
menu visibility. Its editable list has the fields `sequence` (handle), `name`,
and `fold` (`Folded in Kanban`); the form has the same three fields. The
installed demo contains seven ordered statuses: New Request, To Order,
Ordered, Registered, Downgraded, Reserve, and Waiting List. The adjacent
`fleet_vehicle_tag_action` / Tags surface was audited but deliberately not
implemented in this batch.

Core3 adds `/fleet/config/statuses` and the detail alias
`/fleet/config/statuses/detail`. `pages/statuses.yaml` and
`pages/fleet-status-detail.yaml` are presentation-only; `api/statuses.yaml`
and `api/status-detail.yaml` own the datasources and mutations and join their
corresponding pages by `page.id`. Migrations
`20260911240000-021-fleet-statuses-schema.yaml` and
`20260911241000-022-fleet-statuses-data.yaml` provide an idempotent,
service-owned table with the seven fixed records, row versions, ordering, and
fixed timestamp `2026-01-15 00:00:00`. Fleet users retain read access while
manager permission is required for create, edit, and delete. Empty,
not-found, transport, 401/403, duplicate, blank-name, invalid-sequence,
missing-record, and stale-row-version contracts are explicit in the API and
focused tests. There is no archive transition because the Odoo model has no
active/archive field.

Implementation commit: `6b08c715`
(`feat(fleet): add vehicle status configuration parity`).

Authenticated headless browser evidence used the active Odoo reference and an
isolated Core3 runtime. Both list surfaces were visually inspected at the
required viewports; Core3 also opened the form route and created a temporary
status through the inline `New`/`Save` flow. All browser passes reported no
page errors, no settled failed requests, and no horizontal overflow:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Vehicle Status list | 1440x900 | `/tmp/odoo-fleet-status-desktop-20260911.png` | `13c032e37ee790ee3ecfffc966ebf3d8392b8ab9608f4d22054a3b7c899507c5` |
| Odoo Vehicle Status list | 390x844 | `/tmp/odoo-fleet-status-mobile-20260911.png` | `5758a71cf84c996def4741d075327285a62e65b134634850cce8cae46a51f5f6` |
| Core3 Vehicle Status list | 1440x900 | `/tmp/core3-fleet-status-desktop-20260911.png` | `2558ea23bd9aed200fad687f3951b298b309c75adc0aa0cafed9b7d1fedc104d` |
| Core3 Vehicle Status list | 390x844 | `/tmp/core3-fleet-status-mobile-20260911.png` | `2a6be77a775a23f54518d9eeb7f4b394ed5ab533978c2268ce77f4262e47637d` |
| Core3 Vehicle Status form | 1440x900 | `/tmp/core3-fleet-status-detail-desktop-20260911.png` | `6e90c10a54ea109ef9da7f3796303a366913e2e2d9accedf0438449f25edf986` |
| Core3 Vehicle Status form | 390x844 | `/tmp/core3-fleet-status-detail-mobile-20260911.png` | `a7c77ac7be81c03ec5c63c5f525b38adfc3b23357d46080b76716152c685be8f` |

Focused coverage passes 4 tests and 49 assertions. The UI audit reports 515
pages, 522 routes, and 907 datasources; ESLint, global and Fleet CSS builds,
and `git diff --check` pass. The expected visual difference is the Core3
Fluent shell and blue accent versus Odoo's purple application shell; table
labels, status ordering, drag handles, checkboxes, responsive widths, and
the Odoo list/form control structure are matched.

## Configuration > Vehicle > Tags checkpoint (2026-09-11)

The next uncovered Fleet action was `fleet_vehicle_tag_action`, reached from
the technical `Fleet > Configuration > Vehicle > Tags` menu. The active Odoo
reference is `http://localhost:8069`, database `core3_user_demo`, authenticated
as `admin@core3.local`; the source is
`/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml` at
revision `65975996`. The action is list/form for `fleet.vehicle.tag`, with an
editable `Vehicle Tags` list containing `Tag Name` and `Color`; the source menu
is restricted to `base.group_no_one`, while Fleet users have read access and
Fleet managers have full CRUD access. The seeded reference rows are Junior,
Senior, Employee Car, and Purchased with Odoo color indexes 1 through 4.

Core3 adds `/fleet/config/tags` and `/fleet/config/tags/detail`. The
presentation-only `pages/tags.yaml` and `pages/fleet-tag-detail.yaml` are
joined to service-owned `api/tags.yaml` and `api/tag-detail.yaml` by matching
`page.id`. Migrations `20260911242000-023-fleet-tags-schema.yaml` and
`20260911243000-024-fleet-tags-data.yaml` provide four deterministic rows with
fixed timestamps. The list supports inline creation/editing, detail
navigation, search, and explicit empty, not-found, transport, 401, and 403
states. Manager-only mutations validate non-blank names and Odoo color indexes
0 through 11, reject duplicates, missing rows, and stale row versions, and
support delete. Shared list/grid YAML now supports the Odoo color palette while
remaining backward-compatible with existing color cells.

Implementation commits: `543a5fe7` (`feat(fleet): add vehicle tags parity`)
and `0f78cdeb` (`fix(fleet): apply Odoo palette to vehicle tags`).

Authenticated headless browser evidence used the active Odoo reference and an
isolated Core3 runtime. The Odoo and Core3 list surfaces were checked at both
required viewports; Core3 also navigated to the detail route. Captures are
temporary, remain under `/tmp`, and are not committed:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Vehicle Tags list | 1440x900 | `/tmp/odoo-fleet-tags-desktop-20260911.png` | `483d30e9d27d66c6fdf78229ec259ea4315a3a6e6ecfbce225019fb89793bcaf` |
| Odoo Vehicle Tags list | 390x844 | `/tmp/odoo-fleet-tags-mobile-20260911.png` | `7d0b5893824e1068c6c94e93249dacb4e88586eeaae248dec246c397e4dc6893` |
| Core3 Vehicle Tags list | 1440x900 | `/tmp/core3-fleet-tags-desktop-20260911.png` | `22cc0adab6cd658c3edc30ccfe47aac1a72556e5dd17d31289a8d527896e77b9` |
| Core3 Vehicle Tags list | 390x844 | `/tmp/core3-fleet-tags-mobile-20260911.png` | `b3d67faff86caa8989f5ed602216b1599b9e53789d3e7e07c8f79d40bf59947d` |
| Core3 Vehicle Tag form | 1440x900 | `/tmp/core3-fleet-tag-detail-desktop-final-20260911.png` | `b5df21ce3dacccfe82544d6d3ac3d0fe1234a0381289de6efa02c1a7c3de05d1` |
| Core3 Vehicle Tag form | 390x844 | `/tmp/core3-fleet-tag-detail-mobile-final-20260911.png` | `7e7fea2cd16fcc36ea9416c3c6ea23356587a51412106b6b81e982e173da8c78` |

Focused coverage passes 4 tests and 54 assertions after correcting the
unsupported `palette` column schema key. The UI audit, ESLint, global and
Fleet CSS builds, and `git diff --check` pass. The browser evidence reported
no page errors, settled request failures, or horizontal overflow. The bounded
visual difference is the shared Core3 Fluent shell versus Odoo's purple shell;
the exact tag labels, color swatches, list/detail structure, and responsive
widths are retained.

## Configuration > Vehicle > Activity Types checkpoint (2026-09-11)

The next uncovered Fleet action was `mail_activity_type_action_config_fleet`,
reached from `Fleet > Configuration > Vehicle > Activity Types`. The active
reference was `http://localhost:8069`, database `core3_user_demo`,
authenticated as `admin@core3.local`; the Odoo source was
`/home/nhanjs/projects/odoo` at revision `659759969d53`. The live action is id
766, model `mail.activity.type`, with `list,kanban,form` views, domain
`res_model IS NULL OR res_model = fleet.vehicle.log.contract`, and context
default `res_model=fleet.vehicle.log.contract`. Its menu is sequence 99 and
restricted to `base.group_no_one`. The source list exposes sequence (handle),
Name, Default Summary, Planned in, and Type; the kanban shows icon/name,
summary, model, and default user; the form is grouped into Activity Settings
and Next Activity with a Default Note section.

The live filtered dataset has six rows in sequence order: To-Do (2), Email
(3), Call (6), Meeting (9), Contract to Renew (10, Fleet contract model), and
Document (25). The source access rows grant base users read-only access and
Fleet managers full CRUD. Core3 therefore exposes reads under `fleet.read`
and mutations under `fleet.manage`, with the To-Do archive guard and the
source-protected To-Do/Call/Meeting delete guard. Model targeting is limited
to global activity types or `fleet.vehicle.log.contract`, matching the Fleet
action domain/default.

Core3 adds `/fleet/config/activity-types` and
`/fleet/config/activity-types/detail`. The page YAML files are
presentation-only; `api/activity-types.yaml` and
`api/activity-type-detail.yaml` own their datasources/actions and join their
corresponding pages by `page.id`. Migrations
`20260911260000-025-fleet-activity-types-schema.yaml` and
`20260911261000-026-fleet-activity-types-data.yaml` provide an idempotent,
service-owned table with six fixed live rows, icons, schedule metadata, row
versions, and fixed timestamp `2026-01-15 00:00:00`. Empty, not-found,
transport, 401/403, blank-name, unsupported-model, invalid-schedule,
protected-standard-row, missing-record, and stale-row-version contracts are
explicit in the API and focused tests. Existing Fleet status and tag routes
are unchanged.

Implementation commit: `e6f3ede6`
(`feat(fleet): add activity types configuration parity`).

Authenticated headless Odoo/Core3 evidence was captured at both required
viewports. Odoo list and Core3 list/detail surfaces were visually inspected;
the stable final matrix reported no console errors, page errors, failed
requests, or horizontal overflow (`1440/1440` and `390/390` document/body
widths). Screenshots remain outside Git:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Activity Types list | 1440x900 | `/tmp/odoo-fleet-activity-types-desktop-20260911.png` | `aca1d5a17a958607d47e88ebde526c52637376bb4edb37ce43f01bc8be8b4af8` |
| Odoo Activity Types kanban | 390x844 | `/tmp/odoo-fleet-activity-types-mobile-20260911.png` | `486af6f634c76bc996fb1fe483b4cd034c5580f5cf3a55a4c2c0fdfe12cc68a4` |
| Core3 Activity Types list | 1440x900 | `/tmp/core3-fleet-activity-types-desktop-20260911.png` | `8dac89fc1cf4a9043a66b299ee026c6e05bf0f4611f0ca3773a6e1aa068f3775` |
| Core3 Activity Types cards | 390x844 | `/tmp/core3-fleet-activity-types-mobile-20260911.png` | `b07c5318d3d3edfd5219b012b5d0906e44ddc618a58d9bc648c33042631cdb3b` |
| Core3 Activity Type form | 1440x900 | `/tmp/core3-fleet-activity-type-detail-desktop-20260911.png` | `5ff89d6d8694a64f4b90718c43f5810c56019ec4e094f5e93132b02f5afa8af5` |
| Core3 Activity Type form | 390x844 | `/tmp/core3-fleet-activity-type-detail-mobile-20260911.png` | `69e6328503a375b883ec64e46752a272856d36a401f07a6c728c61e9f27dfa64` |

Focused coverage passes 4 tests and 53 assertions. `bun run audit` passes
with 519 pages, 526 routes, and 911 datasources; ESLint, the Fleet Sass
build, and `git diff --check` pass. The expected bounded visual difference
is the Core3 Fluent shell and blue accent versus Odoo's purple shell; row
ordering, labels, schedule values, model targeting, pager/search affordance,
responsive cards, and the source form grouping are represented.

## Configuration > Services > Types checkpoint (2026-09-11)

The active Odoo 19 Fleet reference exposes `fleet_vehicle_service_types_action`
(action 759) under Fleet > Configuration > Services > Types. It is a
`fleet.service.type` list/form action with default grouping by Category,
editable-bottom list behavior, Name and Category columns, and the standard
`Contract` / `Service` selection. The live dataset contains 3 Contract and 71
Service rows. Fleet users can read; Fleet managers can create, edit, and
delete, with service-log relation guards on deletion.

Core3 adds `/fleet/config/service-types` and the explicit detail route
`/fleet/config/service-types/detail`. Page and API YAML remain separate and
join through `page.id`. Migrations `20260911270000-027` and
`20260911271000-028` provide 74 deterministic rows with fixed timestamps,
stable ordering, idempotent installation, and row-versioned manager CRUD.
The service contract covers search, category filtering/grouping, empty,
not-found, unauthorized, forbidden, transport, duplicate, invalid-category,
missing-record, stale-write, and in-use-delete states.

Focused coverage passes 4 tests and 56 assertions. Authenticated Odoo and
Core3 browser checks covered 1440x900 and 390x844. The Core3 runtime showed
the expected collapsed Contract (3) and Service (71) groups, exact viewport
widths, and no page errors or HTTP error responses. Images remain outside Git:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Fleet service types | 1440x900 | `/tmp/odoo-fleet-service-types-desktop-20260911.png` | `9eb50e4a138f8e71a637b23f7fe6a663cbe77cca0c3cdb77025044f4f8f7a098` |
| Odoo Fleet service types | 390x844 | `/tmp/odoo-fleet-service-types-mobile-20260911.png` | `6cd66e642ea7d243d6a392c113af22568b2a5a5c6773bf6c3536049454e71483` |
| Core3 Fleet service types | 1440x900 | `/tmp/core3-fleet-service-types-current-1440x900.png` | `8be8bd1222856cfca3d01a055451e6be889785805546a179fc5c798d54373857` |
| Core3 Fleet service types | 390x844 | `/tmp/core3-fleet-service-types-current-390x844.png` | `49a7a81390fb0ab81d7f64535cb588740e2919293635b69944b4b106c4e75c7b` |

The bounded visual residual is the shared Core3 Fluent shell versus Odoo's
purple shell; labels, grouping, row ordering, responsive width, and form
transition are preserved. Images remain under `/tmp` and are not committed.
