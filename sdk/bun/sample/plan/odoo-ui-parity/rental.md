# Sale Rental UI parity

Status: blocked (reference addon unavailable)

This sub-plan records the source-availability gate for Odoo 19 `sale_renting`.
It does not approve implementation or claim UI parity.

## Reference source gate

- The reference checkout is `/home/nhanjs/projects/odoo`, branch `19.0`, at
  revision `659759969d535d286b656c96b675e4612b925ddd`.
- The sibling path expected by this worktree, `../odoo`, resolves lexically to
  `/home/nhanjs/projects/core3-worktrees/odoo` but that directory is absent.
- The available checkout was checked at the exact candidate addon paths
  `/home/nhanjs/projects/odoo/addons/sale_renting`,
  `/home/nhanjs/projects/odoo/odoo/addons/sale_renting`, and
  `/home/nhanjs/projects/odoo/enterprise/addons/sale_renting`; all are
  missing.
- `git ls-tree -r --name-only HEAD` for that checkout contains no
  `sale_renting` or `sale-renting` addon path, manifest, model, view, action,
  security, demo, or static source file. Repository translation files contain
  module-name strings only; they are not a usable UI reference.
- Consequently, the Odoo manifest and official demo declaration cannot be
  inspected, and the required menu/action/view/permission/route inventory
  cannot be truthfully produced. The parent register's
  `unavailable in supplied source` status is confirmed.

## Current Core3 ownership and boundary

Core3 has an existing `sale_renting` service, but this is not evidence of an
Odoo-equivalent surface:

- Service manifest: `services/sale_renting/manifest.yaml`.
- Permissions: `services/sale_renting/permissions.yaml` (`rental.read`,
  `rental.write`, `rental.manage`).
- Storage and migrations: `storage.yaml`,
  `migrations/20260817093000-001-rental-foundation.yaml`, and
  `migrations/20260817103000-002-rental-demo-data.yaml`.
- Page contracts: `pages/rentals.yaml`, `pages/rental-detail.yaml`,
  `pages/rental-availability.yaml`, and `pages/rental-events.yaml`; workflow
  contract: `pages/rental-workflow.yaml`.
- The events page has `page.id: rental-events`, but the service manifest exposes
  it at `/events`. No `/rental-events` route or explicit page `route` was found.
  This boundary must be reconciled before it can be used as a parity route;
  `/events` must not be confused with the separate Core3 Events module.

These YAML contracts are existing Core3-owned behavior and may be audited for
internal consistency, but their labels, states, menu structure, actions, and
fixtures must not be presented as Odoo source-derived until the matching addon
is available. No authenticated Odoo/Core3 screenshots are recorded because
there is no installable `sale_renting` reference surface to compare.

## Dependency and next gate

This plan remains blocked pending a matching Odoo 19 source bundle that includes
the `sale_renting` addon and its declared dependencies, plus an authenticated
reference database with the addon installed and usable demo or explicitly
recorded empty data. The next audit must then:

1. inspect the addon manifest and demo declaration;
2. inventory the complete visible Sales > Rental menu/action tree, groups,
   ordering, action context, views, labels, and state transitions;
3. capture the reference at `1440x900` and `390x844` before asserting any Core3
   visual or responsive parity; and
4. reconcile the observed source route with the existing Core3 manifest/page
   boundary, then run focused YAML/API/permission/fixture checks.

Until that gate is satisfied, do not add screens, labels, routes, fixtures,
screenshots, or visual parity claims for `sale_renting`.

## Audit evidence (2026-09-12)

- Wave 2 rechecked the expected sibling path first: `/home/nhanjs/projects/core3-worktrees/odoo` is absent. The resolved local reference `/home/nhanjs/projects/odoo` is on `19.0` at `659759969d535d286b656c96b675e4612b925ddd`.
- `git ls-tree -r --name-only HEAD | rg '(^|/)(sale_renting|sale-renting)(/|$)'` returned no matches in the resolved reference checkout. This is the exact blocker for selecting a reference-supported Rental UI/UX surface in this wave.
- No Core3 Rental YAML, fixture, permission, route, or test changes were made because the source gate is still blocked. In particular, the existing `/events` menu entry remains an internal contract issue and is not promoted to `/rental-events` without an Odoo route reference.
- After frozen workspace dependency installation, `bun run audit` from
  `sdk/bun/sample` passed: 647 pages, 662 routes, and 1,113 datasources were
  discovered, with every discovered page using supported shared components and
  having a route. This is a Core3-wide structural audit, not Odoo parity
  evidence.
- The initial pre-install audit attempt exited with `Cannot find module
  '@core3/server/discovery'` from `scripts/audit-order-ui.ts`; that was a
  fresh-worktree dependency-resolution failure and is now resolved.
- `bun run lint` from `sdk/bun` passed with no output.
- No rental-specific integration test is present in `sdk/bun/sample/test`.
- `git diff --check` passes for this documentation change.

## Current live reference inventory (2026-09-20)

The authenticated reference at `http://localhost:8069`, database
`core3_reference`, was inspected once with the local QA account. The session
landed at `/odoo/discuss` without page or 5xx errors. The inventory is
authoritative for this wave:

| Inventory item | Observed result |
| --- | --- |
| Installed addon | `sale_management` 19.0.1.0 and `sale` 19.0.1.2 are installed; `sale_renting` is absent from `ir.module.module` |
| Sales > Rental menu | No Rental application/menu/action is present |
| Rental actions | No rental action window, server action, or rental-specific view is reachable |
| Rental models/fields | `product.template` and `sale.order` have no fields whose names contain `rent` |
| Rental view modes/tabs | None observable because the addon/menu/action is absent |
| Rental permissions/groups | No rental-specific groups or action visibility can be inventoried |
| Official demo declaration | Not inspectable without the missing addon manifest |

The observed Sales tree therefore stops at the installed Sales surface: Orders
(Quotations, Orders, Sales Teams, Customers), Products (Products, Product
Variants, Pricelists), Reporting (Sales, Salespersons, Products, Customers),
and Configuration (Sales Orders, Products, Online Payments, Activities). None
of those entries is a Rental substitute.

## Gap matrix after live inspection

| Stable ID | Odoo requirement | Current Core3 source | Gap/status | Bounded next action |
| --- | --- | --- | --- | --- |
| RENT-INV-001 | Sales > Rental menu/action tree | `services/sale_renting/manifest.yaml` | incompatible: `/events` collides with the Events module and no Odoo source route exists | retain the Core3-owned rental-events convention as `/rental-events`; do not call it Odoo-derived |
| RENT-DATA-001 | Rental order persistence and deterministic records | `storage.yaml`, foundation/demo migrations | partial: rental/order/event tables and two fixtures exist, but no active/archive or CRUD test contract is declared | preserve stable fixture IDs and add only validated module-owned fields/contracts |
| RENT-API-001 | Page datasource/API separation by page identity | page YAML files currently embed datasources/actions | incompatible with the YAML-first separation rule | move backend datasource/action declarations to `api/*.yaml`, joined by matching `page.id` |
| RENT-WF-001 | Reserve, pickup, return, cancel lifecycle | `pages/rental-workflow.yaml` and embedded page actions | partial: transitions and overlap/stale guards exist; direct API and persistence evidence is missing | keep workflow contract and document executable permission/persistence cases |
| RENT-CRUD-001 | Create/read/edit and management boundary | `pages/rentals.yaml`, `pages/rental-detail.yaml` | partial: create and quotation-only edit exist; delete/archive/import/export are not implemented | implement only the next coherent CRUD slice within `sale_renting`; do not imply full parity |
| RENT-UI-001 | Odoo list/kanban/form/calendar/pivot/graph states | rental page YAML | unverified: reference has no Rental screen to compare | retain visible text tabs and capture Core3-only smoke evidence; no visual parity claim |
| RENT-QA-001 | Authenticated desktop/mobile, permission, workflow and reload proof | `qa/sale-renting.md` | pending: prior smoke covered route rendering only | add focused cases and execute after the API/route change |

This matrix deliberately distinguishes an internal Core3 implementation slice
from Odoo parity. It must be revised if a later wave installs a matching
`sale_renting` addon and exposes a real reference surface.

## Current-wave Core3 verification (2026-09-20)

The focused implementation commit is
`2ddc1e28e3c57c5f80a7f664d258c15d00a89b60`. In a clean temporary worktree,
page discovery passed with 661 pages, 670 routes, and 1,162 datasources. An
authenticated admin query returned the two deterministic rental fixtures and
one rental event; a new quotation was created, reserved, picked up, returned,
and reloaded as `Returned` with three persisted lifecycle events. An
unauthenticated caller received 401 for read and mutation, while the
dispatcher received 403 for both. Authenticated browser smoke rendered
`/rental-events` at 1440x900 and 390x844; the runtime resolved it to
`/sale-renting/rental-events` and reported no page/5xx errors or horizontal
overflow. Captures are under `/tmp/core3-odoo-parity/` and are not committed.

This evidence verifies the Core3 API/page boundary and route/lifecycle slice
only. It does not remove the Odoo source gate or claim Rental visual parity.
