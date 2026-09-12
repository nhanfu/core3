# Odoo 19 PLM UI parity audit — source dependency gate

## Status

`blocked`: the exact Odoo 19 Community addon `mrp_plm` is not present in the
supplied local Odoo source, and no approved Odoo menu/view contract or
authenticated Odoo PLM capture is available. This sub-plan is not `ready`, so
no PLM UI cloning or parity claim may begin.

The parent register already records `plm | mrp_plm | unavailable in supplied
source | odoo-ui-parity/plm.md | planned` in
`plan/odoo-ui-parity-plan.md:75-99`. The parent gate requires the complete
source menu/action/view inventory before implementation and requires paired
authenticated desktop/mobile comparison before acceptance.

## 2026-09-12 source audit

The requested addon directory is absent:

| Required source | Result |
| --- | --- |
| `/home/nhanjs/projects/odoo/addons/mrp_plm` | missing |
| `/home/nhanjs/projects/odoo/addons/mrp_plm/__manifest__.py` | unavailable because the addon directory is missing |
| `/home/nhanjs/projects/odoo/addons/mrp_plm/views/` | unavailable because the addon directory is missing |
| `/home/nhanjs/projects/odoo/addons/mrp_plm/security/` | unavailable because the addon directory is missing |
| `/home/nhanjs/projects/odoo/addons/mrp_plm/data/` | unavailable because the addon directory is missing |
| Any `/home/nhanjs/projects/**/mrp_plm/` local addon checkout | not found |

The only matching path in the local project tree is the unrelated Odoo icon
asset `/home/nhanjs/projects/odoo/odoo/addons/base/static/img/icons/mrp_plm.png`;
it is not the `mrp_plm` addon and provides no manifest, views, menus, actions,
permissions, demo data, routes, or screen contract. The Odoo checkout is on
branch `19.0` at commit `659759969d535d286b656c96b675e4612b925ddd`; its
`addons/` contains `mrp` and other manufacturing extensions but not
`mrp_plm`.

Consequently, this audit cannot truthfully record the Odoo 19 addon version,
manifest demo-data declaration, menu ordering, visibility groups, action IDs,
view IDs, Odoo web routes, exact labels, or desktop/mobile reference captures.
No Odoo PLM browser capture was attempted: without the addon installed, any
reachable route would be an uninstalled or unrelated surface and would violate
the parent plan's evidence rule.

## Current Core3 ownership and absence

Core3 does contain an existing service boundary at
`sdk/bun/sample/services/plm/`. Its current ownership is:

- `manifest.yaml`: declares the `plm` domain service and an invented menu at
  `/engineering-revisions`, with `Engineering Revisions` and `PLM Analysis`
  entries.
- `permissions.yaml`: declares `plm.read`, `plm.write`, and `plm.manage`.
- `migrations/20260818190000-001-plm-foundation.yaml` and
  `20260818191000-002-plm-demo-data.yaml`: own a generic `plm_revisions` table
  and one deterministic ECO-like record.
- `pages/revisions.yaml`, `pages/revision-detail.yaml`, and `pages/analysis.yaml`:
  declare the existing presentation and page-local datasources/actions.
- `pages/plm-workflow.yaml`: declares the generic Draft → Submitted → Approved
  → Released/Rejected workflow.
- `storage.yaml` and `styles/index.scss`: own DuckDB selection and minimal
  page styling.

This boundary is not evidence that `mrp_plm` exists or that its labels match.
There is no `sdk/bun/sample/services/plm/api/` directory, no PLM-focused
integration test, and no Odoo-derived source inventory. The existing page YAML
also embeds SQL queries and mutations, whereas the shared contract in
`screen-mock-data.md` requires layout-only pages and service-owned API
fragments joined by matching `page.id`. The existing `/engineering-revisions`
and `/plm-analysis` routes therefore remain an unverified Core3 workflow, not a
parity slice.

The parent config separately exposes the existing Core3 app entry at
`sdk/bun/sample/config.yaml:181-188` (`PLM`, route
`/engineering-revisions`, module `plm`). That route must not be treated as an
Odoo route until the source menu and action contract is observed.

## Why implementation is blocked

PLM is not a screen that can be safely approximated from the name “PLM” or
from the existing generic revision workflow. Without `mrp_plm` source and an
installed reference surface, the audit cannot establish whether the target
screens are change orders, ECO stages, BoMs, revisions, approvals, or related
manufacturing views; their exact Odoo labels, hierarchy, action contexts,
permissions, view modes, fields, status states, empty states, and responsive
behavior would all be guesses. Implementing a list/form slice now would create
unverifiable UI and would violate the parent plan's binding-fidelity and
page/API fixture gates.

## Concrete dependency and next gate

Before this sub-plan can be marked `ready`, provision the matching Odoo 19
`mrp_plm` addon source at the exact missing path
`/home/nhanjs/projects/odoo/addons/mrp_plm/` (or record the authoritative
alternate checkout path and commit), then:

1. Verify `__manifest__.py`, addon version, dependencies, official demo-data
   entries, `views/`, `security/`, `data/`, and any wizard/report files.
2. Install/enable `mrp_plm` in the active reference database named by the
   parent plan, confirm its installed state and demo-data status, and navigate
   every visible PLM menu entry as the authenticated reference user.
3. Record the exact application/menu/submenu/action ordering, visibility
   groups, action contexts, Odoo routes, models, view IDs/modes, labels, fields,
   buttons, status states, empty states, and required desktop/mobile captures.
4. Reconcile that source inventory with the existing Core3 `plm` boundary and
   either explicitly retire/rename the generic workflow or define a bounded
   Odoo-owned slice. Keep page layouts separate from
   `services/plm/api/*.yaml`, joined only by matching `page.id`.
5. Add deterministic default, filtered, empty, error, forbidden, not-found,
   stale-write, and invalid-input fixtures/contracts plus focused permission
   tests before any browser comparison.
6. Capture paired authenticated Odoo/Core3 states at `1440x900` and `390x844`
   under `/tmp/core3-odoo-parity`; do not add captures to Git. Only after those
   checks pass may this plan move to `ready` or record a bounded implementation
   batch.

## Verification record

- Addon/path audit: `mrp_plm` directory, manifest, views, security, and data
  paths absent; only the unrelated icon asset was found.
- Core3 ownership audit: existing tracked `services/plm` files listed above;
  no PLM API directory or focused test exists.
- No source-backed UI implementation or browser evidence was added.
- No scratch artifacts were created.
