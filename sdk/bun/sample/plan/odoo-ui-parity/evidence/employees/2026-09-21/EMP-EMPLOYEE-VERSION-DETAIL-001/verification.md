# EMP-EMPLOYEE-VERSION-DETAIL-001 verification

## Implementation

Odoo source mapping is `action_hr_version` in
`addons/hr/views/hr_version_views.xml` and `action_open_version` in
`addons/hr/models/hr_version.py`. Core3 adds the page/API-separated
`employee-version-detail` contract at `/employees/versions/detail`, makes the
Employee Records list row and double-click open it, and exposes a read-only
Open employee navigation action. The detail query joins `employee_versions`
to `employees`, applies `employees.read` and current-company scope, and
projects effective dates, contract state, employee, company, job, department,
schedule, wage, template, and note.

No new migration rows were needed: migration `20260912103000-019` already
provides deterministic current, future, expired, and archived snapshots. The
focused restart test verifies those persisted records rather than duplicating
fixtures.

## Focused verification

`bun test test/employees_version_detail.integration.test.ts`

- 3 passed, 0 failed
- 21 assertions
- Covers source/action mapping, page/API separation, row navigation, detail
  projection, current/future/expired/archived states, read/company/missing
  boundaries, migration replay, and file-backed restart.

Scoped ESLint passed for the focused test. `bun run audit` passed with 690
pages, 699 routes, and 1,284 datasources. `git diff --check` passed before
staging.

## Authenticated browser evidence

### Core3

- Desktop: `core3-desktop.png`; mobile: `core3-mobile.png`.
- Admin authentication succeeded at 1440x900 and 390x844.
- `/employees/versions` and `/employees/versions/detail?id=employee-version-admin-current`
  rendered their route titles with zero browser/request errors.
- The session company is `Core3 Demo Company`; deterministic version fixtures
  are owned by `Core3 Vietnam`. The list is empty and the populated snapshot is
  absent by the company guard. Raw results are in `core3-browser.json` and the
  per-viewport JSON files.

### Odoo

- Desktop: `odoo-desktop.png`; mobile: `odoo-mobile.png`.
- Authenticated `core3_reference` Employee Records loaded with 28 rows at
  desktop; the Abigail Peterson row opened the source-resolved employee form
  route `/odoo/versions/6/hr.employee/6`.
- Mobile reached the same authenticated resolved employee detail route and
  rendered Abigail Peterson, History, and the employee-form context. The
  compact list did not expose `.o_data_row` nodes, so the mobile capture uses
  the resolved route after desktop row mapping; this is explicit, not inferred
  list parity.
- Raw results are in `odoo-browser.json` and the per-viewport JSON files; no
  page errors or failed requests were recorded in the final captures.

## Disposition

The read-only version snapshot contract, permission/company boundary,
durability, and Odoo action mapping are verified. Core3 populated values remain
blocked by the deterministic `Core3 Vietnam` versus authenticated `Core3 Demo
Company` fixture mismatch, so this is conditional bounded evidence only. No
aggregate Employees sign-off is claimed.
