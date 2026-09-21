# Verification

## Focused integration

`bun test test/employees_wage.integration.test.ts`

- **4 passed, 0 failed, 20 assertions**
- Odoo model/view mapping and separate page/API contracts are asserted.
- CRUD updates employee and active Payroll wage together.
- Actor, stale, wrong-company, negative-wage, and atomic no-partial-write
  boundaries are covered.
- Migration replay and file-backed restart preserve both wage projections.

## Browser/runtime

- Authenticated Odoo desktop/mobile captures succeeded for employee 1; both
  show Payroll > Contract Overview > Wage `$7,540.00`. Seven unrelated Odoo
  shell asset 404 console messages were recorded in the viewport JSON.
- Core3 authenticated browser evidence is blocked before route load. The
  bounded `bun dev --db=ddb --memory` attempt reached Vite startup but failed
  during global page discovery with:
  `PageSchemaError: Invalid page definition: actions[1].title is not allowed`.
  This is outside the Employees diff and no other owner's page was changed.

## Remaining blocker

Core3 desktop/mobile rendering and live mutation browser proof remain
conditional until the unrelated page-schema error is repaired by its owner.
The Employees YAML itself parses and the focused repository lifecycle is
green; no browser sign-off is claimed.
