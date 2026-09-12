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
