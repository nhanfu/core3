# Test results

- `bun test ./test/accounting_invoice_duplicate.integration.test.ts --timeout 20000`
  — **3 passed, 25 assertions**.
- The focused test covers page/API binding, Odoo source mapping, action-menu
  contract, permission/actor/stale/missing guards, draft lifecycle resets,
  origin chatter, restart persistence, and idempotent migration replay.
- `git diff --check` — passed after the feature and evidence edits.
- `bun run audit` — passed: 865 pages, 873 routes, and 1,832 datasources.
- No paired authenticated Core3/Odoo desktop/mobile capture was taken for this
  bounded contract slice; the audit is not visual-parity evidence.
