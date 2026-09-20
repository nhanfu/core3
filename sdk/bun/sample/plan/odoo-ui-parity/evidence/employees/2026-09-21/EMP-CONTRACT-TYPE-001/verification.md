# Verification

Feature ID: `EMP-CONTRACT-TYPE-001`

## Focused lifecycle

- `bun test test/employees_contract_type.integration.test.ts`: **4 passed,
  20 assertions**.
- Source mapping and page/API separation pass.
- Employee create persists a deterministic contract type.
- Manager-only edit updates both `employees` and the current active
  `employee_versions` row.
- Empty actor, stale row version, wrong company, and unsupported type are
  rejected atomically.
- Migration replay and file-backed restart preserve deterministic values.

## Static checks

- `bun run audit`: **705 pages / 714 routes / 1340 datasources**, pass.
- `bunx eslint test/employees_contract_type.integration.test.ts`: pass.
- `git diff --check`: pass.

## Browser comparison

Core3 and Odoo desktop/mobile captures are in this directory. Core3 labels
and responsive layout pass with no browser/request errors or horizontal
overflow, but the current authenticated company does not contain the seeded
employee. Odoo reaches the Payroll Contract Type label, but Abigail Peterson
has no value. The exact fixture/reference limitations are recorded in
`README.md` and `browser.json`; this is conditional evidence only.
