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
- The events page has `page.id: rental-events` and the service-owned route is
  `/rental-events`. It must not be confused with the separate Core3 Events
  module's `/events` route.

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
- At that historical snapshot no Core3 Rental changes had been made because
  the source gate was still blocked. The later owner commits corrected the
  internal route to `/rental-events`; this remains a Core3 convention, not an
  Odoo-derived route claim.
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
| RENT-INV-001 | Sales > Rental menu/action tree | `services/sale_renting/manifest.yaml` | Core3 route corrected to `/rental-events`; no Odoo source route exists | retain the Core3-owned convention; do not call it Odoo-derived |
| RENT-DATA-001 | Rental order persistence and deterministic records | `storage.yaml`, foundation/demo migrations, focused integration test | pass for create/edit/lifecycle/event/availability persistence; active/archive and broader management CRUD remain out of scope | preserve stable fixture IDs and keep the source gate explicit |
| RENT-API-001 | Page datasource/API separation by page identity | `pages/*.yaml` plus matching `api/*.yaml` fragments | pass: backend declarations join layout by `page.id` | retain the YAML-first boundary |
| RENT-WF-001 | Reserve, pickup, return, cancel lifecycle | `pages/rental-workflow.yaml` and API action fragments | pass for bounded transitions, stale/overlap/date guards, events, and availability; broader Odoo workflow parity is blocked | retain the workflow contract and re-audit only with a matching addon |
| RENT-CRUD-001 | Create/read/edit and management boundary | `pages/rentals.yaml`, `pages/rental-detail.yaml`, focused integration test | pass for create/read/quotation edit/validation/cancel; delete/archive/import/export are not implemented | do not imply full management CRUD or full Odoo parity |
| RENT-UI-001 | Odoo list/kanban/form/calendar/pivot/graph states | rental page YAML | unverified: reference has no Rental screen to compare | retain visible text tabs and capture Core3-only smoke evidence; no visual parity claim |
| RENT-QA-001 | Authenticated desktop/mobile, permission, workflow and reload proof | `qa/sale-renting.md`, `sale_renting.integration.test.ts` | pass for the bounded Core3 slice; Odoo comparison remains blocked | retain captures outside Git and keep the missing-addon gate explicit |

This matrix deliberately distinguishes an internal Core3 implementation slice
from Odoo parity. It must be revised if a later wave installs a matching
`sale_renting` addon and exposes a real reference surface.

## Current-wave Core3 verification (2026-09-20)

The focused implementation commit is `3c4210ab` (parent boundary commit
`2ddc1e28`). `bun test ./test/sale_renting.integration.test.ts` passed with 3
tests and 46 assertions; `bun run audit` passed with 661 pages, 670 routes,
and 1,162 datasources. Authenticated API smoke observed admin/dispatcher login
200/200, unauthenticated read 401, dispatcher read/create 403, successful
admin create/edit/cancel, 422 invalid quantity/date, 409 stale edit, 409
overlap, 422 missing-date reserve, and availability totals reflecting the
reserved row. The prior authenticated lifecycle evidence also covered
reserve/pickup/return and three persisted events. Authenticated Playwright
smoke rendered `/rental-events` at 1440x900 and `/rentals` at 390x844; the
runtime resolved them to `/sale-renting/rental-events` and
`/sale-renting/rentals`, with visible seeded data, no page/5xx errors, and no
horizontal overflow. Captures are under `/tmp/core3-odoo-parity/` and are not
committed.

This evidence verifies the Core3 API/page boundary and route/lifecycle slice
only. It does not remove the Odoo source gate or claim Rental visual parity.
