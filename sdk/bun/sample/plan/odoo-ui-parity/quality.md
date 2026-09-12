# Quality parity source gate

Audit date: 2026-09-12

## Source availability

The exact Odoo 19 Community `quality` addon is unavailable in the supplied
local source. The available Odoo checkout is
`/home/nhanjs/projects/odoo`, branch `19.0`, commit
`659759969d535d286b656c96b675e4612b925ddd`. These exact source paths are
absent:

- `/home/nhanjs/projects/odoo/addons/quality/`
- `/home/nhanjs/projects/odoo/addons/quality/__manifest__.py`
- `/home/nhanjs/projects/odoo/addons/quality/models/`
- `/home/nhanjs/projects/odoo/addons/quality/views/`
- `/home/nhanjs/projects/odoo/addons/quality/security/`
- `/home/nhanjs/projects/odoo/addons/quality/data/`
- `/home/nhanjs/projects/odoo/addons/quality/demo/`
- `/home/nhanjs/projects/odoo/addons/quality/static/`

`git ls-tree` finds no `addons/quality` entry in that checkout, and the
repository-wide local project search found no other relevant Odoo checkout
containing an `addons/quality` source tree. The parent register in
`plan/odoo-ui-parity-plan.md` records this module as `unavailable in supplied
source`, with this sub-plan path and status `planned`.

Without the addon manifest, Python models, XML menus/actions/views, security,
demo data, and static assets, there is no authoritative Odoo menu tree, visible
label set, action/view-mode inventory, workflow, route, or responsive reference
surface to clone. UI implementation would therefore invent Odoo behavior and
text, so this audit makes no Odoo parity claim and does not add a UI slice.

## Current Core3 ownership

Core3 does have an independently owned, service-declared boundary at
`sdk/bun/sample/services/quality/`:

- `manifest.yaml` registers the `quality` domain service, `/quality-checks`,
  and Core3 menu entries for Quality Checks and Quality Analysis.
- `permissions.yaml` declares `quality.read`, `quality.write`, and
  `quality.manage`.
- `storage.yaml` selects the DuckDB service boundary.
- `migrations/20260818180000-001-quality-foundation.yaml` owns the
  `quality_checks` table.
- `migrations/20260818181000-002-quality-demo-data.yaml` supplies the
  Core3-owned `quality-demo-001` fixture.
- `pages/checks.yaml`, `pages/check-detail.yaml`, and `pages/analysis.yaml`
  declare page-bound datasources and actions; `pages/quality-workflow.yaml`
  declares the Core3-owned check workflow.

This is a Core3 approximation, not evidence of Odoo parity. The existing
pages join their own data and actions by page-local contracts; no Odoo-derived
page/API contract, authenticated comparison capture, or quality-specific test
was found in this worktree.

## Dependency / next gate

Keep Quality implementation blocked at the source gate. The next gate is to
provide:

1. A local Odoo 19 checkout containing
   `/home/nhanjs/projects/odoo/addons/quality/` with its manifest, models,
   XML views/actions/menus, security, demo data, and relevant static assets.
2. An authenticated Odoo 19 reference database with the Quality application
   installed and reachable for desktop and mobile menu/screen inspection.
3. A browser-ready Core3 checkout with dependencies installed so authenticated
   desktop/mobile comparison captures can be made under
   `/tmp/core3-odoo-parity` without committing images.

After that gate passes, inventory the real Odoo menu tree and screens first;
then implement one bounded YAML slice with its page/API contracts joined by
`page.id`, deterministic datasource fixtures, permission boundaries, focused
tests, and authenticated desktop/mobile captures. Until then, do not revise
the existing Core3 labels, routes, workflows, fixtures, or visuals as if they
were Odoo-derived.
