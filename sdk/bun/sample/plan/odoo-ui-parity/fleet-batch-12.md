# Fleet parity batch 12: vehicle Services stat action

Status: implemented; static contract verification complete. Authenticated
desktop/mobile visual verification is pending runtime checks and is not
claimed until both Odoo and Core3 captures are available.

This bounded slice adds the three source-backed Services stat-button states to
the existing vehicle form/API seam. It does not add a menu, duplicate the
Services action, or implement the shared mail activity primitive.

## Verification

- `bun test test/fleet_vehicle_services_action.integration.test.ts`: 2 tests,
  14 assertions passed.
- `bun run audit`: passed with 635 pages, 651 routes, and 1089 datasources.
- `bunx eslint test/fleet_vehicle_services_action.integration.test.ts`: passed.
- `git diff --check`: passed.

Capture was attempted under
`/tmp/core3-odoo-parity/fleet-services-action-20260912/` at 1440x900 and
390x844 with `/usr/bin/google-chrome`. Odoo `/web/login` returned HTTP 200, but
the active `core3_codex_demo_20260912` database query returned
`fleet|uninstalled`, so an authenticated Fleet action could not be rendered.
Core3 started with `CHOKIDAR_USEPOLLING=true bun run dev --db=ddb --memory`
and served the login/shell routes, but `/api/modules` returned HTTP 502 and no
authenticated token/session could be established for the vehicle detail.
The normal Vite launch separately failed with `EMFILE: too many open files`;
polling allowed startup, but did not resolve the gateway/auth boundary. The
desktop/mobile images in the directory are explicitly unauthenticated capture
attempt artifacts, not parity evidence. No visual claim is made.

## Vehicles visual-contract audit — 2026-09-12

The bounded Vehicles audit inspected the Odoo vehicle action/menu source and
the existing Core3 page/manifest. Odoo orders the Fleet child actions Fleet,
Contracts, Services, Odometers (sequences 0, 2, 3, 10) and opens the vehicle
action in `kanban,list,form,pivot,activity` order. Core3 had Odometers before
Contracts and Services and opened List before Kanban. The manifest and page
were corrected to preserve those source-backed orders, with regression coverage
in `test/fleet_vehicles_visual.integration.test.ts`.

No authenticated Vehicles captures were available under `/tmp`; the existing
Fleet captures cover other surfaces. The current Odoo/Core3 runtime boundary
also remains the one recorded above, so this audit makes no browser visual
claim for Vehicles.
