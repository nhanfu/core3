# INV-WAREHOUSE-RESUPPLY-001 verification

- Focused integration: `bun test test/inventory_warehouse_resupply.integration.test.ts
  test/inventory_warehouses.integration.test.ts` — PASS, 7 tests / 81
  assertions (the feature suite alone is 4 tests / 29 assertions).
- Coverage includes Odoo source markers, page/API ownership and discovery,
  deterministic same-company relation/options, Add/Remove CRUD, manager
  permission, actor/company/duplicate/stale guards, migration replay, and
  file-backed restart persistence.
- Core3 browser: authenticated admin loaded warehouse detail on desktop
  (1440x900) and mobile (390x844), rendered the seeded Overflow Warehouse
  relation, opened the Add resupply warehouse form, recorded no HTTP 4xx/5xx
  responses or page errors, and had no horizontal overflow.
- Odoo live probe: HTTP 303 to `/web/login?redirect=%2Fweb%3F`; authenticated
  paired Odoo visual/action evidence was unavailable in the supplied runtime.
- YAML/discovery audit: PASS, 722 pages / 731 routes / 1,400 datasources.
- Scoped TypeScript lint: PASS (`bunx eslint
  test/inventory_warehouse_resupply.integration.test.ts`).
- `git diff --check`: PASS.
