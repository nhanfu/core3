# Fleet parity batch 11: vehicle Contracts stat action

Status: implemented; visual gate remains open because the required authenticated
reference and Core3 runtimes are unavailable in this worktree.

## Exact Odoo trace

At Odoo revision `65975996`,
`addons/fleet/views/fleet_vehicle_views.xml` defines the vehicle-form stat
button with `icon="fa-book"`, `contract_count`, label `Contracts`, and
`return_action_to_open`. Its context is
`{'xml_id':'fleet_vehicle_log_contract_action', 'search_default_inactive': not active}`.
The target action in `views/fleet_vehicle_cost_views.xml` is
`fleet_vehicle_log_contract_action`, model `fleet.vehicle.log.contract`, named
`Contracts`, with view order `list,kanban,form,graph,pivot,activity` and
context `{'search_default_open': 1}`. The source vehicle method resolves the
action and applies the current vehicle domain; the action's open default
corresponds to Core3's default `Running` contract filter.

## Bounded Core3 delivery

The existing `vehicle-detail` page/API pair now exposes `Contracts` with
`contract_count`, permission `fleet.read`, and navigation to
`/fleet/contracts` carrying `vehicle_id={state.id}` and
`search_default_open=true`. The existing Contracts page/API pair remains
presentation/API separated by `page.id`, retains all seven declared desktop
view states (including the mobile card fallback), and applies the vehicle
filter and open-contract default. The detail datasource counts the vehicle's
non-closed contracts from service-owned storage using deterministic SQL.

The focused test `test/fleet_vehicle_contract_action.integration.test.ts`
checks the exact source labels/icon/context/action modes, page/API joins,
read permission, vehicle filter, deterministic count, and seeded scoped rows.
Existing contract tests continue to cover search, empty, transport, CRUD,
validation, stale, not-found, relation, and permission boundaries.

## Browser evidence and limitations

Capture was attempted under `/tmp/core3-odoo-parity/fleet-batch11-20260912/`.
No images are claimed. The local Odoo endpoints responded, but its active
database currently reports Fleet as uninstalled, so the menu/action cannot be
rendered. Core3 briefly reached Vite-ready on the memory dev command, but the
subsequent probes could not connect; the required persistent Playwright/
`js_repl` session is also unavailable in this Codex session. Earlier built-
server fallback attempts recorded the exact DuckDB startup error `Parser Error:
Adding columns with constraints not yet supported`, and the Vite watcher hit
the host `EMFILE` limit. Therefore no authenticated 1440x900 or 390x844
visual-parity claim is made. Images remain outside Git.
