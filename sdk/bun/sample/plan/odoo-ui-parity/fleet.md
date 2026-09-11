# Odoo 19 UI parity — Fleet

Status: in progress; vehicle, Odometers, Contracts, Manufacturers, Models,
and the Services checkpoint below are implemented in isolated worktrees, with
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
  `core3_personal`, login `codex@core3.local`, and password
  `Core3Odoo2026!`. Authentication succeeded as the personal administrator.
  SQL returned `fleet|installed|t|19.0.0.1` from `ir_module_module`, proving
  Fleet is installed with demo data in the personal reference database.
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
