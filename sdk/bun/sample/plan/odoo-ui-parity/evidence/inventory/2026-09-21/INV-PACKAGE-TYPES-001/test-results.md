# Verification

- `bun test ./test/inventory_package_types.integration.test.ts --timeout 20000`
  — pass, 4 tests / 33 assertions.
- Coverage includes page/API discovery, deterministic source-shaped fixtures,
  company filtering, dimensions/package-use/barcode guards, manager CRUD,
  in-use deletion, permission boundary, and file-backed restart persistence.
- Authenticated Core3 browser capture: desktop and mobile list/detail states,
  HTTP 200 page/source requests, no page errors, and no horizontal overflow.
- `bun run audit` — pass, 712 pages / 721 routes / 1,359 datasources.
- `bunx eslint test/inventory_package_types.integration.test.ts` — pass.
- Scoped `git diff --check` — pass.
