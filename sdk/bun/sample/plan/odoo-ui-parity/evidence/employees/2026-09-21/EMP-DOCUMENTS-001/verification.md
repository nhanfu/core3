# EMP-DOCUMENTS-001 verification

Date: 2026-09-21

## Feature

Odoo's Personal → Documents group exposes `id_card` and `driving_license` as
binary fields. Core3 implements durable presence and filename metadata through
separate page/API YAML contracts and migration `20260921180000-048`.

## Focused verification

- `bun test test/employees_documents.integration.test.ts`: 4 passed, 23 assertions.
- Coverage includes source mapping, page/API separation, create/edit/read,
  filename validation, stale/company guards, migration replay, and restart.
- `bun run audit`: 701 pages, 710 routes, 1,328 datasources; passed.
- Scoped ESLint and `git diff --check`: pass.

## Authenticated evidence

- `odoo-desktop.png` and `odoo-mobile.png`: authenticated Abigail Peterson
  Personal view; Documents, ID Card Copy, and Driving License are visible at
  1440x900 and 390x844 with no page/request errors or horizontal overflow.
- `browser.json`: authenticated URLs, labels, viewport checks, and blocker data.
- `core3-blocker.md`: `bun run agent:module -- employees --port=3311`
  stopped before listening because global discovery rejected concurrent
  Inventory `components[2].title is not allowed`.

The Core3 binary upload transport remains an explicit follow-up boundary. No
Core3 UI pass or aggregate Employees sign-off is claimed.

The optional aggregate Employees glob was not used for sign-off: an existing
`test/employees.integration.test.ts` assertion failed while broadly selecting
an `archive_employee*` action and the long-running aggregate process was
stopped. The focused Documents suite remains green.
