# Documents parity audit — source and dependency gate

Status: blocked; not ready for Odoo UI implementation.

Audit date: 2026-09-12

## Reference/source availability

The module register names Odoo 19 Community addon `documents` as the reference
and currently marks its source unavailable. This audit confirms that status:

- The path relative to this worktree, `../odoo`, resolves to
  `/home/nhanjs/projects/core3-worktrees/odoo` and is missing.
- The supplied local Odoo checkout is `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd`, Odoo `19.0`.
- The expected Community addon path
  `/home/nhanjs/projects/odoo/addons/documents` is missing, as is its manifest
  `/home/nhanjs/projects/odoo/addons/documents/__manifest__.py`.
- The checkout has no `enterprise/` directory, and
  `/home/nhanjs/projects/odoo/enterprise/addons/documents/__manifest__.py` is
  also missing.
- `git ls-files` finds no `documents` addon source, manifest, views, models,
  controllers, static assets, or demo data. The only related paths are generic
  document/attachment integrations in other addons; they are not the Odoo
  Documents application source.

The authenticated reference instance at `http://127.0.0.1:8073` was checked at
both requested viewport sizes, 1440x900 and 390x844. Login reached `/odoo`, but
the rendered page contained no `Documents` text or Documents application
surface. This is consistent with the missing addon source and is not a usable
visual reference. No reference screenshots are claimed or retained.

## Current Core3 ownership

Core3 does have a service boundary at
`sdk/bun/sample/services/documents/`, registered by
`sdk/bun/sample/config.yaml` as the `documents` app at `/documents`.
Its current ownership is limited to the following declarative foundation:

- `manifest.yaml`: Documents / Workspace menu entries for `/documents` and
  `/document-analysis`.
- `permissions.yaml`: `documents.read`, `documents.write`, and
  `documents.manage`.
- `migrations/20260818110000-001-documents-foundation.yaml`: DuckDB-compatible
  `document_folders` and `documents` tables plus indexes.
- `pages/documents.yaml`: a Documents list with List, Kanban, and Calendar
  modes, search/filter metadata, a create form, and submit/approve/archive
  action contracts.
- `pages/analysis.yaml`: document count, byte total, expiring-soon stat, and
  a by-type chart.
- `pages/document-workflow.yaml`: Draft, Submitted, Approved, and Archived
  workflow metadata.
- `storage.yaml`: only the DuckDB storage driver declaration; it does not
  define document-file upload/download storage.

The service has no seeded document/folder/demo records, no Odoo-derived menu
or action inventory, and no addon-backed screen specification. The page
queries also depend on document tables without a service-owned fixture contract
for populated, empty, filtered, denied, or transport-error states.

## Why UI cloning cannot truthfully proceed

The parity contract requires the complete Odoo menu/action/view inventory and a
desktop/mobile comparison before implementation. Neither the `documents`
addon manifest/source nor an installed Documents reference surface is present,
so labels, ordering, routes, view hierarchy, responsive behavior, permissions,
fixtures, and visual tokens cannot be verified. The existing Core3 YAML is a
product-specific foundation, not evidence of Odoo parity; treating it as the
reference would fabricate the missing source contract.

The Core3 runtime capture was attempted from this worktree with the documented
memory command `bun run dev --db=ddb --memory`. It did not reach a server:
the worktree has no `vite` executable and Bun reported
`Cannot find module '@core3/server/module'`. Consequently no authenticated
Core3 desktop/mobile screenshots were produced. This is a runtime/dependency
blocker, separate from the Odoo source-availability blocker.

## Dependency / next gate

Keep this sub-plan `blocked` and keep the parent register status `planned`.
Before any Documents UI work starts, provide one of the following:

1. A permitted Odoo 19 reference checkout containing the exact
   `documents` addon, including `__manifest__.py`, Python/XML/JS/SCSS source,
   access/security declarations, assets, and demo data; or
2. An explicitly approved alternative reference specification that replaces
   the missing addon source and defines the complete menu/action/view and
   permission inventory.

After that dependency is available, install/restore the Core3 worktree runtime,
verify `/api/modules` readiness, inventory the reference menu tree and screens,
define deterministic backend fixtures at the datasource boundary, and only
then mark this plan `ready`. Authenticated comparison capture must cover every
implemented reference surface at 1440x900 and 390x844. Any screenshots belong
only under `/tmp/core3-odoo-parity` and must not be committed.

## Wave 2 slice decision

No bounded Documents UI/UX slice is implementable in this wave. The source
gate was rechecked against the supplied Odoo checkout before selecting work:
the checkout is reachable at `/home/nhanjs/projects/odoo` on revision
`659759969d535d286b656c96b675e4612b925ddd`, but neither `addons/documents`
nor an Enterprise checkout exists. Searching the Community addon tree only
finds generic attachment, recruitment, and EDI integrations; none supplies
the Documents application contract.

The Odoo runtime is reachable at `http://127.0.0.1:8073`, but the prior
authenticated probe at `/odoo` found no `Documents` text or application
surface at either target viewport. This cannot establish labels, actions,
views, responsive behavior, or permission boundaries for a parity slice.

The Core3 runtime audit was rerun from this worktree with
`bun run dev --db=ddb --memory`. Service discovery reached the Documents
DuckDB-memory module and selected fallback ports 3002/3011, then startup
failed because this isolated worktree has no installed `vite` executable and
cannot resolve `@core3/server/module`. The existing Documents manifest,
permissions, page/workflow, analysis, and migration YAML all parse
successfully with Bun, but that is contract validation only and is not UI
evidence. No page/API contract, fixture, permission change, implementation
test, or screenshot was added because doing so would invent an Odoo reference
surface that is unavailable.

## Audit evidence

Read-only checks performed:

- `test -e ../odoo` — missing.
- Exact Community and Enterprise `documents` addon/manifest checks — missing.
- Odoo checkout revision and `git ls-files` addon search — no Documents addon.
- Authenticated Odoo browser probe — `/odoo` at both target viewport sizes, no
  Documents surface.
- Core3 service/config/YAML ownership inspection — foundation listed above.
- Core3 runtime start attempt — module discovery reached Documents, then
  blocked by missing worktree dependencies (`vite` and `@core3/server/module`).
- Bun YAML parse pass over all existing Documents manifest, permission, page,
  workflow, analysis, and migration contracts — passed.
- `git diff --check` — passed after the audit update.
