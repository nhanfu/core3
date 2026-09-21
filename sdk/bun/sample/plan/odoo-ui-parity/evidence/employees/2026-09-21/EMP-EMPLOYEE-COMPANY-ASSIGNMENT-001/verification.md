# EMP-EMPLOYEE-COMPANY-ASSIGNMENT-001 verification

Date: 2026-09-21

- Focused integration: `employees_company_assignment.integration.test.ts` —
  4 tests, 22 assertions, pass.
- Adjacent Employees, Work-tab, and Employee Type suites: 21 tests, 222
  assertions, pass.
- Merged employee-detail API/page schema validation: pass.
- Scoped ESLint: pass (`bunx eslint
  test/employees_company_assignment.integration.test.ts`). Shared UI audit:
  pass (743 pages, 752 routes, 1473 datasources).
- The focused test was rerun after evidence capture: 4 tests, 22 assertions,
  pass. `git diff --check` is run on the staged Employees-only allowlist before
  commit.
- Core3 browser attempt: authenticated desktop and mobile routes loaded with
  no request/page failures and no horizontal overflow. The Company field
  rendered as `—` and Change Company was not visible because the deterministic
  Employee records are `Core3 Vietnam`/unassigned while the authenticated
  session is `Core3 Demo Company`; this is a fixture/company blocker, not a
  claimed browser sign-off.
- Odoo browser attempt: local Odoo was reachable, but the available local
  credential was rejected at desktop and mobile. See `odoo-browser.json`.

No aggregate Employees sign-off is claimed.
