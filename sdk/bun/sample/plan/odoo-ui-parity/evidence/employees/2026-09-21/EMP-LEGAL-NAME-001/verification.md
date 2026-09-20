# EMP-LEGAL-NAME-001 verification

Date: 2026-09-21

## Feature

Odoo `hr.employee.legal_name` is an editable stored field in the Personal
Information group. Core3 implements the paired page/API contracts and durable
migration `20260921170000-047`.

## Focused verification

- `bun test test/employees_legal_name.integration.test.ts`: 4 passed, 18 assertions.
- Coverage includes Odoo source mapping, page/API separation, fallback CRUD,
  stale/company guards, migration replay, and file-backed restart.
- Scoped ESLint and `git diff --check`: pass.

## Browser evidence

- `core3-desktop.png`: authenticated page; Legal Name renders. The employee
  fixture belongs to Core3 Vietnam while the session is Core3 Demo Company, so
  the populated value is company-scoped out.
- `core3-mobile.png`: authenticated attempt; page API returned 500 during
  global discovery. The runtime log identifies concurrent Inventory YAML
  references to unresolved `inventory_route_detail`, route actions, and rules
  datasources. This is an external shared-checkout blocker, not an Employees
  change.
- `odoo-desktop.png` and `odoo-mobile.png`: authenticated Abigail Peterson
  Personal Information view with Legal Name visible.
- `browser.json`: authenticated URLs, labels, response/error details, viewport
  sizes, and blocker notes.

This evidence is conditional; it is not aggregate Employees sign-off.
