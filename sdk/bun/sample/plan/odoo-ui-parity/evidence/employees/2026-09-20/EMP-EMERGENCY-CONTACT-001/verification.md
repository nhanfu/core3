# Verification

- Focused: `bun test test/employees_emergency_contact.integration.test.ts` —
  3 passed, 21 assertions.
- Full module: `bun test test/employees_*.integration.test.ts` — 79 passed,
  0 failed, 762 assertions across 25 files.
- Static: merged employee page/API validation, audit (679 pages / 688 routes /
  1,250 datasources), scoped ESLint, and diff-check passed.
- Odoo browser: authenticated desktop/mobile Personal-tab captures pass with
  Emergency Contact visible and no page errors or overflow.
- Core3 browser blocker: shared runtime discovery returns HTTP 500 for the
  employee detail because another concurrent page is rejected for
  `components[0].row_action`. This slice leaves that owner scope untouched.
