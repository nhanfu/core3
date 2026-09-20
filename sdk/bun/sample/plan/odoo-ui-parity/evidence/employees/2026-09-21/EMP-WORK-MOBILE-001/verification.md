# EMP-WORK-MOBILE-001 verification

Date: 2026-09-21

## Feature

Odoo exposes `hr.employee.mobile_phone` as the visible Work Mobile field in the
employee form. Core3 implements it through separate employee-detail page/API
YAML and durable migration `20260921190000-049`.

## Focused verification

- `bun test test/employees_work_mobile.integration.test.ts`: 4 passed, 16 assertions.
- Coverage includes source mapping, page/API separation, create/edit/read,
  current-company and stale-row guards, migration replay, and file-backed
  restart.
- `bun run audit`: 703 pages, 712 routes, 1,335 datasources; passed.
- Scoped ESLint and `git diff --check`: passed.

## Authenticated evidence

- `odoo-desktop.png` and `odoo-mobile.png`: authenticated Abigail Peterson
  employee form at 1440x900 and 390x844; the Work Mobile label is visible with
  no request/page errors or horizontal overflow. The reference value is empty.
- `browser.json`: authenticated URLs, labels, viewport checks, and blockers.
- `core3-blocker.md`: Core3 startup stopped before authentication on unrelated
  Inventory search-schema keys.

No Core3 UI pass or aggregate Employees sign-off is claimed.
