# Verification

- Focused: `bun test test/employees_family.integration.test.ts` — 4 passed,
  24 assertions.
- Browser: authenticated Core3 and Odoo desktop/mobile Family captures pass;
  Core3 has no page/request errors, and Odoo has no page errors or overflow.
- Static: merged employee page/API validation, audit (681 pages / 690 routes /
  1,256 datasources), scoped ESLint, and diff-check pass.
- Odoo shell noise: seven app-icon 404s and one aborted desktop `/mail/data`
  request, excluded from feature failure assessment.
