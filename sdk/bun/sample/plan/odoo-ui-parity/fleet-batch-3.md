# Fleet parity batch 3: Contracts

Status: implemented and verified in the isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-fleet-next-20260910`.

This batch closes the next uncovered visible action from the authenticated
owned Odoo inventory: `Fleet > Fleet > Contracts`, menu id `521`, action id
`806`. On 2026-09-10, Odoo reported Fleet module state
`installed`, `demo=true`, version `19.0.0.1`; action 806 reported model
`fleet.vehicle.log.contract`, view order `list,kanban,form,graph,pivot,activity`,
and context `{'search_default_open': 1}`. The menu is visible to group id 87.

## Delivered contract

- Core3 route `/fleet/contracts`, menu-owned by `fleet.read`, with the page
  YAML in `services/fleet/pages/contracts.yaml` and API YAML in
  `services/fleet/api/contracts.yaml`, both joined by page id `fleet-contracts`.
- Desktop action tabs preserve Odoo's visible List, Kanban, Graph, Pivot, and
  Activity modes; the form opens as a responsive side panel. Mobile uses a
  card/kanban presentation so vehicle, date range, vendor, and status remain
  readable at 390px.
- Detail route `/fleet/contracts/detail` is separately owned by page/API id
  `contract-detail` and exposes visible text tabs Information, Costs &
  Recurrence, and Notes, plus Edit and Renew Contract workflow actions.
- Empty, search, transport-error, missing-record, permission, relation, date,
  cost, and renewal workflow guards are covered by the focused integration
  suite.

## Deterministic data policy

Migration `20260910130000-005-fleet-contracts-schema.yaml` uses fixed
`TIMESTAMP '2026-01-15 00:00:00'` defaults for created/updated timestamps;
it does not use `CURRENT_TIMESTAMP`. Migration
`20260910131000-006-fleet-contracts-data.yaml` seeds six stable contract ids,
five Running records (the Odoo open default) and one Expired record. The
renewal guard uses fixed reference date `DATE '2026-01-15'`, matching the
fixture date policy; no wall-clock date is used.

## Evidence and checks

Authenticated Odoo reference captures, deliberately excluded from Git:

- `/tmp/odoo-owned-fleet-contracts-desktop.png` — 1440x900
- `/tmp/odoo-owned-fleet-contracts-mobile.png` — 390x844

Authenticated Core3 captures, deliberately excluded from Git:

- `/tmp/core3-owned-fleet-contracts-desktop.png` — 1440x900 list
- `/tmp/core3-owned-fleet-contract-detail-desktop.png` — 1440x900 detail
- `/tmp/core3-owned-fleet-contracts-mobile.png` — 390x844 responsive card view

The final browser pass re-authenticated as `admin@tms.local`, waited for the
Contracts body and generated stylesheet, checked zero failed responses and no
horizontal overflow, then exercised search (`City Bike`), empty fixture,
expected 503 transport error, detail tabs, and mobile content. CSS was built
in the isolated worktree before capture; the earlier unstyled/loading captures
were rejected and are not evidence.

Focused checks:

- `bun test test/fleet_contracts.integration.test.ts test/fleet_odometers.integration.test.ts`
- `bun run css:build:global`
- `bun run css:build:fleet`
- `bun run audit`
- `git diff --check`

## Explicit limitations

This is a bounded contract slice, not the full Fleet module. Chatter/activity
history, recurrence scheduling, real employee/vendor relation CRUD,
multi-company filtering, contract stat buttons from vehicle forms, and the
remaining Services, Reporting, and Configuration actions remain deferred.
Core3 fixtures intentionally use deterministic text vendor/driver values while
preserving the visible Odoo contract fields and workflow states.
