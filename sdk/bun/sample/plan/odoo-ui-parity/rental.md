# Sale Rental UI parity

Status: blocked

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
