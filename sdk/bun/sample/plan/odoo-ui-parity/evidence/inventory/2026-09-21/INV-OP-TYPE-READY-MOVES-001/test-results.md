# INV-OP-TYPE-READY-MOVES-001 verification

- Focused integration: `bun test test/inventory_operation_type_ready_moves.integration.test.ts`
  — PASS, 4 tests / 23 assertions.
- Focused regression pair: `bun test
  test/inventory_operation_type_ready_moves.integration.test.ts
  test/inventory_operation_types.integration.test.ts` — PASS, 7 tests / 64
  assertions.
- Covered source markers for Odoo's `stock.action_get_picking_type_ready_moves`,
  page/API separation and discovery, Ready unfinished move filtering,
  permission and company boundaries, migration replay, and file-backed restart.
- Core3 browser: authenticated admin route opened the Operations action from
  operation type `operation-deliveries` on desktop (1440x900) and mobile
  (390x844). Both reached
  `/inventory/operation-types/ready-moves?operation_type_id=operation-deliveries`,
  rendered the deterministic `WH/OUT/READY/0001` row, recorded no HTTP 4xx/5xx
  responses or page errors, and had no horizontal overflow.
- Odoo live probe: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; authenticated
  paired Odoo visual/action evidence was unavailable in the supplied runtime.
- YAML/discovery audit: PASS — `bun run audit` reported 721 pages, 730 routes,
  and 1396 datasources.
- Scoped lint: PASS — `bunx eslint
  test/inventory_operation_type_ready_moves.integration.test.ts`. YAML files
  are outside the repository ESLint configuration and were schema-validated by
  the focused test.
- `git diff --check`: PASS.
