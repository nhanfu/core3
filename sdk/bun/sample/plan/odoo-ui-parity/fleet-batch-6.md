# Fleet parity batch 6: service types

Status: implemented and visually verified.

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

## Verification evidence

The merged Core3 implementation uses the existing Fleet service-type page/API
contracts and the canonical service-type migrations at versions 027/028. The
list keeps the source's collapsed `Contract (3)` and `Service (71)` groups;
the detail route opens the seeded `Summer tires` record. The list and detail
surfaces remain page/API-owned by matching `page.id` values, with manager-only
CRUD, relation-protected delete, and optimistic row-version guards.

Authenticated paired captures were visually inspected after rebuilding CSS:

| Surface | Viewport | Capture | SHA-256 | Checks |
| --- | --- | --- | --- | --- |
| Odoo list | 1440x900 | `/tmp/odoo-fleet-service-types-desktop-20260911.png` | `9eb50e4a138f8e71a637b23f7fe6a663cbe77cca0c3cdb77025044f4f8f7a098` | 3/71 collapsed groups |
| Odoo list | 390x844 | `/tmp/odoo-fleet-service-types-mobile-20260911.png` | `6cd66e642ea7d243d6a392c113af22568b2a5a5c6773bf6c3536049454e71483` | responsive grouped list |
| Core3 list | 1440x900 | `/tmp/core3-fleet-service-types-list-desktop-1440x900.png` | `384336142f2fc337cae3af7f37c79699300b53ac29be2b597750269bd9e1c95a` | 3/71 groups; 1440/1440 width; no browser errors |
| Core3 list | 390x844 | `/tmp/core3-fleet-service-types-list-mobile-390x844.png` | `13b30bca83dcf923f3f5e555d907c2c68dbd90466c529c3c3569495e75e9647b` | 3/71 groups; 390/390 width; no browser errors |
| Core3 detail | 1440x900 | `/tmp/core3-fleet-service-types-detail-desktop-1440x900.png` | `ba272626db2694d29441bc777566e58a1e30f44a8190b5430ce2efb2bff7e75c` | Summer tires; 1440/1440 width; no browser errors |
| Core3 detail | 390x844 | `/tmp/core3-fleet-service-types-detail-mobile-390x844.png` | `7bdaf718a528c208510ec52586b74e62afd5e799704e7042accaed4cbd908ef2` | Summer tires; 390/390 width; no browser errors |

Focused Fleet coverage passes 45 tests and 556 assertions across 13 files;
the Fleet UI audit and ESLint pass, and `git diff --check` is clean. Images
remain outside Git.
