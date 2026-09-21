# EMP-DEPARTMENT-001 verification

QA inventory:

- Source mapping: Odoo `department_id` and Work > Department map to separate
  API and page YAML contracts.
- User-visible control: Edit Department with a company-scoped options list;
  assign and clear update the employee display relation and active Payroll
  snapshot.
- Boundaries: missing actor, wrong company, unsupported/inactive department,
  missing active Payroll version, and stale employee row reject atomically.
- Persistence: deterministic migration replay and file-backed restart retain
  the relation.
- Exploratory cases: clear a populated relation; select the My Company
  department while the employee is in Core3 Vietnam.

Verification results:

- Focused integration: `test/employees_department_assignment.integration.test.ts`
  — 4 tests, 23 assertions passed.
- Adjacent regression: Department reporting, Work tab, and base employee
  checks ran; Department/Work tests passed. The broader base file retains two
  unrelated shared-contract failures: `components[4].title is not allowed`
  during discovery, and an existing archive/restore params expectation.
- Odoo authenticated desktop capture: `odoo-desktop.png`, 1440x1100;
  `odoo-captures.json` reports Department visible.
- Odoo authenticated mobile capture: `odoo-mobile.png`, 390x844;
  `odoo-captures.json` reports Department visible.
- Core3 desktop/mobile attempt: `core3-captures.json` records the exact
  bounded startup blocker. The runtime reached Vite but discovery failed on
  the unrelated shared page-schema error `components[4].title is not
  allowed`; no Core3 UI sign-off is claimed.
- Global `bun run audit` is also conditionally blocked by a concurrent shared
  page-schema error: `components[0].views[1].group_by is required for kanban`.

This is conditional feature evidence only; it is not aggregate Employees
parity sign-off.
