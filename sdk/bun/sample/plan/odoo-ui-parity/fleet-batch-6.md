# Fleet parity batch 6: service types

Status: contract recorded before implementation.

## Owned Odoo contract

The live Odoo 19 Fleet reference at `http://localhost:8069` was authenticated
on 2026-09-11 against database `core3_user_demo` as
`admin@core3.local`. The installed Fleet action is
`fleet_vehicle_service_types_action` (live action id `759`) under
`Fleet / Configuration / Services / Types` (menu id `462`, parent menu id
`461`). Its model is `fleet.service.type`, view order is `list,form`, and its
context is `{"search_default_groupby_category": True}`.

The source files at Odoo revision `65975996` define a required translated
`name` and required `category` selection (`Contract` or `Service`). The list
view is editable at the bottom and shows `Name` and `Category`; the search
view searches both fields and exposes `Category` grouping. The action help
copy is `Create a new type of service` followed by the explanation that a
type can be used in contracts, standalone services, or both. There is no
archive field or workflow transition.

The live database contains 74 rows in the default category groups: 3 Contract
and 71 Service. The reference list is initially collapsed to those two groups
at both 1440x900 and 390x844. Fleet officers have read-only access to the
model; Fleet managers have read, write, create, and delete access. The menu is
restricted by `base.group_no_one` in the source configuration tree. Core3
will retain the established Fleet configuration boundary by exposing the
menu to `fleet.manage`, reading under `fleet.read`, and guarding all writes
under `fleet.manage`.

## Bounded Core3 contract

- Add `/fleet/config/service-types` and a separate
  `/fleet/config/service-types/detail` form route. Page YAML stays
  presentation-only; `api/service-types.yaml` and
  `api/service-type-detail.yaml` join their pages by matching `page.id`.
- Preserve the Odoo list/form modes, editable list create/update, default
  Category grouping, Name/Category columns, search, category filter, and
  responsive list/detail states. Do not add archive or workflow controls that
  the source model does not have.
- Seed 74 stable service-type fixtures with the live 3/71 category split,
  fixed timestamps `2026-01-15 00:00:00`, deterministic ordering, and
  idempotent DuckDB/Postgres-compatible migrations. Reconcile the earlier
  generic service fixtures to live names without changing service-log
  relations.
- Provide manager-only create/update/delete with stable generated ids,
  case-insensitive duplicate-name validation, required name/category
  validation, valid-category validation, stale row-version rejection, and
  missing-record 404s. Reads expose explicit empty, not-found, transport,
  401, and 403 states. There is intentionally no archive/delete protection
  beyond relational use guards because `fleet.service.type` has no active
  flag; types referenced by service logs or contracts must return a stable
  `FLEET_SERVICE_TYPE_IN_USE` conflict on delete.
- Focused tests must verify source/action/view parity, page/API discovery,
  migration idempotency and row volume, default grouping data, search and
  category filters, manager CRUD, officer/denied permissions, relation and
  stale-write guards, and all declared error boundaries.
- Authenticated Odoo and Core3 browser evidence must cover the initial grouped
  list and a form/edit transition at 1440x900 and 390x844. Screenshots remain
  under `/tmp` and out of Git; visual comparison must check labels, grouping,
  responsive width, and browser/network errors.

Explicitly deferred: broader Fleet shared relation pickers, chatter/activity,
multi-company policy, and service-type usage navigation. This batch closes
only the visible Services > Types action.
