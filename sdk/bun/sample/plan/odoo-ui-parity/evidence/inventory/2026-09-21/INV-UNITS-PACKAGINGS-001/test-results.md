# Units & Packagings bounded verification

- `bun test ./test/inventory_units_packagings.integration.test.ts --timeout 20000`
  — PASS, 4 tests / 35 assertions.
- `bun run audit` — PASS, 710 pages, 719 routes, 1,353 datasources.
- `bunx eslint test/inventory_units_packagings.integration.test.ts` — PASS.
- `git diff --check -- sdk/bun/sample/services/inventory sdk/bun/sample/test/inventory_units_packagings.integration.test.ts`
  — PASS.
- Authenticated Core3 browser probe — PASS for desktop 1440x900 and mobile
  390x844 list/detail states. Widths equal their viewports; no feature HTTP
  errors or console errors were observed. The app notification poll abort is
  recorded in `browser-results.json` as an unrelated `ERR_ABORTED` request on
  the mobile context.
- Authenticated Odoo browser probe — PASS at `/odoo/action-90` for desktop and
  mobile. The source list renders 21 deterministic/reference rows; no Odoo
  mutation was attempted.
