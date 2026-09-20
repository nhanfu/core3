# Verification

Feature ID: `EMP-HR-RESPONSIBLE-001`

## QA inventory exercised

- Settings tab and Approvers group.
- HR Responsible label/value and dedicated edit action contract.
- Authenticated desktop/mobile layout at 1440x900 and 390x844.
- Empty/company boundary and two off-happy-path browser states: missing
  company-scoped employee and no populated Odoo approver.

## Focused lifecycle

- `bun test test/employees_hr_responsible.integration.test.ts`: **4 passed,
  20 assertions**.
- Source mapping and page/API separation pass.
- Employee create persists a deterministic approver name.
- HR-write edit updates both `employees` and the current active
  `employee_versions` row.
- Empty actor, stale row version, wrong company, and unsupported approver are
  rejected atomically.
- Migration replay and file-backed restart preserve deterministic values.

## Static checks

- `bun run audit`: **706 pages / 715 routes / 1343 datasources**, pass.
- `bunx eslint test/employees_hr_responsible.integration.test.ts`: pass.
- `git diff --check`: pass.

## Browser comparison

Core3 and Odoo desktop/mobile captures are in this directory. Core3 labels and
responsive layout pass with no browser/request errors or horizontal overflow,
but the current authenticated company does not contain the seeded employee.
Odoo reaches the HR Responsible control, but Abigail Peterson has no value.
The exact limitations are recorded in `README.md` and `browser.json`; this is
conditional evidence only.
