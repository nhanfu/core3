# INV-TRANSFER-ACTIVITY-001 verification

- `bun test test/inventory_transfer_activities.integration.test.ts --timeout 20000`
  - PASS: 4 tests, 31 assertions.
  - Covers source/schema separation, deterministic fixture, schedule and Mark
    Done persistence, missing/company/actor/field/stale guards, restart, and
    `inventory.write` permission denial.
- Adjacent transfer regressions: transfer CRUD, workflow, and exchange tests
  pass; the attachment suite has one pre-existing global discovery failure from
  an unrelated page filter schema boundary outside this slice.
- Core3 browser probe: PASS to login shell only; desktop 1440x900 and mobile
  390x844 captures have no request errors or horizontal overflow, but are not
  authenticated activity evidence.
- Odoo comparison: BLOCKED by HTTP 303 to `/web/login?redirect=%2Fweb%3F`.
