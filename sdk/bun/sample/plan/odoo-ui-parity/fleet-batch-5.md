# Fleet parity batch 5: Models

Status: implemented and verified in the isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-fleet-models-20260911` on
branch `agent/odoo-ui-fleet-models-20260911`.

## Owned Odoo contract inspected first

The live owned reference was authenticated on 2026-09-11 at
`http://localhost:8069`, database `core3_owned`, as
`codex@core3.local`. Fleet is installed with demo data. The visible action is
`Fleet / Configuration / Models / Models`, menu id `322`, action id `559`.
The action reports model `fleet.vehicle.model`, view order `list,form`, and
context `{"search_default_groupby_brand": True}`. The live list shows the
columns `Manufacturer`, `Model name`, `Vehicles`, `Category`, and
`Vehicle Type`, grouped by manufacturer. The form shows the `Information` and
`Vendors` tabs, model details, and engine fields. The live database has five
active models: Ford/Focus, Nissan/Micra, Renault/Clio, Toyota/Corolla TS, and
Volkswagen/Golf 8.

## Bounded Core3 delivery

- Added `/fleet/config/models` with page-only presentation YAML and
  convention-discovered API fragments joined by `page.id`.
- Preserved the Odoo list columns, initial manufacturer grouping, search,
  Vehicle Type/Category/Contains Vehicle/Archived filters, list/card/form
  states, responsive card layout, and model detail side panel.
- Added deterministic model/category fixtures with fixed date policy:
  five active Odoo-parity models, one archived no-vehicle model, ten category
  lookup records, and live manufacturer model-count synchronization.
- Added manager CRUD/archive/restore/delete actions, active relation guards,
  duplicate-name guards scoped to manufacturer, measurement validation, and
  stale row-version protection. Read is `fleet.read`; mutations and the
  configuration menu are `fleet.manage`.
- Kept Vendors as an explicit bounded placeholder because vendor relation CRUD
  is deferred with the broader Fleet relation/chatter work.

## Evidence and checks

Live Odoo captures, deliberately excluded from Git:

- `/tmp/odoo-owned-fleet-models-desktop.png` — 1440x900 list grouped by Manufacturer
- `/tmp/odoo-owned-fleet-models-mobile.png` — 390x844 responsive list
- `/tmp/odoo-owned-fleet-model-form-desktop.png` — 1440x900 detail form
- `/tmp/odoo-owned-fleet-model-new-desktop.png` — 1440x900 new form
- `/tmp/odoo-owned-fleet-model-new-mobile.png` — 390x844 new form

Authenticated Core3 captures, deliberately excluded from Git:

- `/tmp/core3-owned-fleet-models-desktop.png` — 1440x900 list/detail side panel
- `/tmp/core3-owned-fleet-models-mobile.png` — 390x844 responsive card list
- `/tmp/core3-owned-fleet-model-detail-desktop.png` — 1440x900 detail side panel
- `/tmp/core3-owned-fleet-model-detail-mobile.png` — 390x844 detail form

Focused checks passed:

- `bun test test/fleet_models.integration.test.ts test/fleet_manufacturers.integration.test.ts` — 6 passed, 98 assertions
- `bun run audit` — 416 pages, 422 routes, 732 datasources; audit passed
- `bun run css:build:fleet` — passed
- `git diff --check` — passed
- Authenticated Core3 Playwright pass at both target viewports — zero failed responses and zero horizontal overflow

## Explicit limitations

This is a bounded Models action slice, not full Fleet parity. Vendor many2many
CRUD, chatter/activity, vehicle relation CRUD/stat navigation, multi-company
scope, and the remaining Categories, Services, Reporting, Settings, Status,
Tags, and Activity Types actions remain deferred. Core3 uses stable local
brand/category relations and deterministic fixture values; it does not claim
full Odoo employee/vendor relation parity.
