# Odoo 19 UI parity — Fleet

Status: ready; vehicle batch 1 and Odometers batch 2 implemented in isolated
worktrees, with remaining Fleet surfaces explicitly deferred below.

This plan remains the source of truth for the complete Fleet parity scope.
The current bounded implementation is recorded in
`odoo-ui-parity/fleet-batch-2.md`.

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
- Authenticated audit on 2026-09-10 used `http://localhost:8069`, database
  `core3_personal`, login `codex@core3.local`, and password
  `Core3Odoo2026!`. Authentication succeeded as the personal administrator.
  SQL returned `fleet|installed|t|19.0.0.1` from `ir_module_module`, proving
  Fleet is installed with demo data in the personal reference database.
- Authenticated Fleet reference captures are present under `/tmp` and are
  deliberately not committed: `/tmp/odoo-fleet-reference-current-desktop.png`
  (1440x900), `/tmp/odoo-fleet-vehicles-mobile.png` (390x844),
  `/tmp/odoo-fleet-odometers-desktop.png` (1440x900), and
  `/tmp/odoo-fleet-odometers-mobile.png` (390x844). The Odometers captures
  show Odoo's real List view with Date, Vehicle, Driver, Odometer Value, and
  Unit columns and its mobile dense-list behavior.

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
