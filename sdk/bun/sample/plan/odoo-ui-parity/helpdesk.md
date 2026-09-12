# Helpdesk parity source gate

Audit date: 2026-09-12

## Source availability

The requested relative Odoo checkout path, `/home/nhanjs/projects/core3-worktrees/odoo`, does not exist. The available local Odoo checkout is `/home/nhanjs/projects/odoo`. Its `addons/` directory contains no `helpdesk` directory, no `helpdesk`-named files, and no Helpdesk addon manifest (`__manifest__.py` or legacy `__openerp__.py`). A repository-wide filename and text search also found no Helpdesk addon source. The checkout is Odoo 19.0 at commit `659759969d535d286b656c96b675e4612b925ddd`.

The parent register in `plan/odoo-ui-parity-plan.md` already records `helpdesk | helpdesk | unavailable in supplied source | odoo-ui-parity/helpdesk.md | planned`. This audit confirms that gate against both the requested relative path and the available `/home/nhanjs/projects/odoo` checkout.

Because there is no local addon manifest, model/view/action source, or installed Helpdesk reference surface to inspect, this worktree cannot truthfully derive Odoo Helpdesk labels, menus, routes, view modes, workflows, fixtures, or screenshots. No Odoo UI parity claim is made here.

## Current Core3 ownership

Core3 does contain an independently owned, service-declared Helpdesk boundary under `sdk/bun/sample/services/helpdesk/`:

- `manifest.yaml` registers the `helpdesk` domain service and `/helpdesk` menu entry, protected by `helpdesk.read`.
- `permissions.yaml` declares `helpdesk.read`, `helpdesk.write`, and `helpdesk.manage`.
- `migrations/20260819100000-001-helpdesk.yaml` owns the `helpdesk_tickets` table and one `helpdesk-demo-001` demo row.
- `pages/tickets.yaml` declares the `helpdesk` page, ticket list datasource, create action, and ticket state transitions.
- `pages/ticket-detail.yaml` declares the `helpdesk-ticket-detail` page and read-only ticket datasource/form contract.
- `pages/helpdesk-workflow.yaml` declares the Core3-owned New → In Progress → Waiting → Resolved → Closed workflow.
- `storage.yaml` declares the service storage driver.

These files prove only that a Core3 Helpdesk service boundary exists. They are not evidence of Odoo parity, because no corresponding Odoo source or authenticated Odoo reference action is available. No Helpdesk-specific test file was found under `sdk/bun/sample/test/` during this audit.

## Browser evidence

An authenticated Core3 capture was attempted after starting the isolated sample with `PORT=3101 FRONTEND_PORT=3102 bun run dev --db=ddb --memory`. Startup reached service discovery and reported `helpdesk=duckdb-memory`, but stopped before serving the UI because this checkout lacks the installed workspace dependencies: `vite: command not found` and `Cannot find module '@core3/server/module'`. Consequently no authenticated 1440x900 or 390x844 capture was possible, and no image artifacts were created. This is an environment limitation, not visual evidence for or against parity.

## Wave 2 source-gate decision (2026-09-12)

The requested `../odoo` path resolves to `/home/nhanjs/projects/core3-worktrees/odoo`, which is absent. The available checkout was inspected at `/home/nhanjs/projects/odoo` (`659759969d535d286b656c96b675e4612b925ddd`). The following source checks returned no Helpdesk addon evidence:

- no `addons/helpdesk/` directory;
- no Helpdesk-named `__manifest__.py` or `__openerp__.py`;
- no Python, XML, CSV, YAML, or YML addon source containing `helpdesk`, `helpdesk.ticket`, or `helpdesk.team` in an addon implementation path; and
- no Helpdesk action/view/menu/security/demo source from which a Core3 page or action could be derived.

The repository does contain unrelated test fixtures and base module catalog/translation references containing the word “Helpdesk”; these do not provide the addon implementation or action evidence required by this plan. Therefore Wave 2 has no source-backed UI/UX slice to implement. The exact blocker remains: provide an Odoo checkout containing `addons/helpdesk/` and an authenticated Odoo database exposing its installed actions before Helpdesk parity work can proceed.

## Dependency / next gate

Keep Helpdesk implementation blocked at the source gate. The next gate is to provide both:

1. a local Odoo checkout containing `addons/helpdesk/` with its manifest, Python models, XML views/actions/menus, security, demo data, and relevant static assets; and
2. an authenticated Odoo reference database/action exposing the installed Helpdesk surface, plus a browser-ready Core3 checkout with dependencies installed for comparison capture.

Only after that gate passes should a BA inventory Helpdesk teams, tickets, stages, SLA, assignment, activities, portal/customer-facing surfaces, permissions, and responsive states against real Odoo evidence. Until then, do not add or revise Core3 Helpdesk screens, routes, labels, fixtures, visual claims, or screenshots as if they were Odoo-derived.
