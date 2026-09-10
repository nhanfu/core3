# Fleet parity batch 4: Manufacturers

Status: contract recorded; implementation in progress in isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-fleet-configuration-next` on
branch `agent/odoo-ui-fleet-configuration-next`.

## Owned Odoo contract recorded first

The live owned reference was authenticated on 2026-09-10 at
`http://127.0.0.1:8069`, database `core3_owned`, as the personal administrator.
The installed Fleet external IDs resolve to the following live records:

| Contract item | Live identity and exact value |
| --- | --- |
| Menu path | `Fleet / Configuration / Models / Manufacturers`; menu id `510`, sequence `1`, active, action `ir.actions.act_window,798` |
| Root menu | `fleet.menu_root`, menu id `507`, `Fleet`, sequence `220`, group `fleet_group_user` id `87` |
| Configuration menu | `fleet.fleet_configuration`, menu id `508`, `Configuration`, sequence `100`, group `fleet_group_manager` id `88` |
| Models menu | `fleet.fleet_models_configuration`, menu id `509`, `Models`, sequence `10`, group `fleet_group_manager` id `88` |
| Window action | `fleet.fleet_vehicle_model_brand_action`, action id `798`, name `Manufacturers`, model `fleet.vehicle.model.brand`, view mode `kanban,list,form`, context `{'search_default_with_models': 1}`, no domain, no binding model |
| Action views | Odoo reports `[[false, kanban], [false, list], [false, form]]`; action order is therefore Kanban, List, Form |
| List view | id `2335`, external ID `fleet_vehicle_model_brand_view_tree`, model `fleet.vehicle.model.brand`, priority `16`; columns `Name`, `Models` (`model_count`) |
| Kanban view | id `2337`, external ID `fleet_vehicle_model_brand_view_kanban`, model `fleet.vehicle.model.brand`, priority `16`; default order `name`, card logo/name/model count, card action opens models |
| Form view | id `2336`, external ID `fleet_vehicle_model_brand_view_form`, model `fleet.vehicle.model.brand`, priority `16`; field `Name`, logo (`image_128`), conditional `Models` stat button |
| Search view | id `2338`, external ID `fleet_vehicle_model_brand_view_search`; field `name`, filter `With Models` (`model_count > 0`), separator, filter `Archived` (`active = false`) |
| Model | `fleet.model_fleet_vehicle_model_brand`, model id `806`, display name `Brand of the vehicle`; required field `name`, editable `active` and `image_128`, readonly `model_count`, one2many `model_ids` |
| Group inheritance | `fleet_group_user` id `87`, label `Officer: Manage all vehicles`, implies `base.group_user`; `fleet_group_manager` id `88`, label `Administrator`, implies group `87` |
| Officer ACL | access id `1109`: read `true`, write/create/unlink `false` on model `806` |
| Manager ACL | access id `1119`: read/write/create/unlink `true` on model `806` |

The live demo currently contains 65 active manufacturers ordered by name. Five
have models (`Ford`, `Nissan`, `Renault`, `Toyota`, `Volkswagen`); the other
60 are empty manufacturers. The action's `With Models` context means the
initial action state is the five-record subset. The `Manufacturers` leaf menu
has no direct groups of its own; visibility is inherited from its manager-only
`Models` and `Configuration` parents.

Source confirmation is `/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml`
records `fleet_vehicle_model_brand_view_tree`,
`fleet_vehicle_model_brand_view_form`, `fleet_vehicle_model_brand_view_kanban`,
`fleet_vehicle_model_brand_view_search`, and
`fleet_vehicle_model_brand_action`; ACL confirmation is
`addons/fleet/security/ir.model.access.csv` rows for
`model_fleet_vehicle_model_brand`.

## Bounded Core3 delivery

- Add only `/fleet/config/manufacturers` and its closely coupled detail/new
  form states. Keep page presentation YAML separate from convention-discovered
  API fragments joined by `page.id`.
- Preserve Kanban/List/Form modes, `With Models` initial filter, search by
  manufacturer, Archived filter, model-count stat navigation, deterministic
  active/archived fixture rows, and responsive 1440x900/390x844 layout.
- Managers get CRUD/archive/unarchive and delete guards; ordinary Fleet users
  can read the list but receive explicit denied responses for mutations;
  users without Fleet access cannot read the route. Empty search and missing
  record states are explicit.
- Use stable IDs, fixed seed date `2026-01-15`, deterministic ordering, and
  service-owned Fleet storage only. No page-local SQL, random/current values,
  or cross-service SQL.

## QA inventory and evidence

Functional checks cover initial filtered list, search, With Models and Archived
filter transitions, Kanban/List/Form switching, model-count navigation, create,
edit, archive/unarchive, delete protection, empty search, missing record,
officer read-only denial, and no-Fleet denial. Exploratory checks cover a
manufacturer with zero models and the 390px form/card action layout.

Visual evidence must include authenticated Odoo and Core3 captures at
1440x900 and 390x844 for the initial list/kanban, filtered/empty list, and
manufacturer form; captures remain under `/tmp` and are never committed.

Deferred by design: Fleet Models, Categories, service/status/tag configuration,
settings, and unrelated manufacturer model CRUD beyond the model-count action.
