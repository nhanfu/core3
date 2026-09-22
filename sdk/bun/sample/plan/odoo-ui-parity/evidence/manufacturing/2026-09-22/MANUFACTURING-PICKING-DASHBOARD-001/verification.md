# Verification

- Focused test: `bun test test/manufacturing_picking_dashboard.integration.test.ts --timeout 20000`
- Result: 3 tests, 24 assertions, 0 failures.
- Coverage: source XML/action identity, page/API separation, route discovery,
  List/Kanban/Form modes, selected operation-type and company scope, search and
  To Do filtering, empty/503 states, permissioned create validation, migration
  replay, and file-backed restart persistence.
- Browser result: blocked before authenticated Manufacturing render; no Odoo
  visual-parity claim.
