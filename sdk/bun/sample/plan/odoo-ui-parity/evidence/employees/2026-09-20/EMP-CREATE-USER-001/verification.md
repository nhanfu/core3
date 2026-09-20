# EMP-CREATE-USER-001 verification

## Implementation

The source workflow is `hr.employee.action_create_user` in
`addons/hr/models/hr_employee.py`, exposed by the ERP-manager-only Create User
button in `addons/hr/views/hr_employee_views.xml`. Core3 uses the existing
page/API-separated employee detail contract, deterministic `employee-user-*`
ids, the shared auth `users` table, and migration
`20260920170000-028-employee-user-provisioning.yaml`. It validates
`auth.users.manage`, employee/current-company scope, existing links, login
uniqueness, employee row version, and input values before atomically inserting
the disabled `invite-pending` user and linking the employee.

This wave also fixes the page action guard: Create User now requires
`state.employee_detail.id` as well as an absent linked user. A missing
company-scoped detail cannot expose an action that would fail against a
nonexistent employee.

## Focused verification

`bun test test/employees_create_user.integration.test.ts`

- 4 passed, 0 failed
- 30 assertions
- Covers Odoo source mapping, page/API separation, modal fields, durable
  linking, permission/company/login/stale/missing/duplicate guards, rollback,
  migration replay, and file-backed restart.

Scoped ESLint and the UI audit/diff checks are run for the final commit.

## Authenticated browser evidence

### Core3

- Desktop: `core3-desktop.png`; mobile: `core3-mobile.png`.
- Admin authentication succeeded at both 1440x900 and 390x844.
- Current company was `Core3 Demo Company`; available alternate company was
  `Core3 Vietnam Branch`.
- `employee-demo-001` is seeded as `Core3 Vietnam`, so the company-scoped
  detail returned no employee data. The corrected guard hid Create User at
  both viewports; browser and HTTP error counts were zero.
- Raw results: `core3-browser.json` and per-viewport JSON files.

### Odoo

- Desktop: `odoo-desktop.png`; mobile: `odoo-mobile.png`.
- Authenticated `core3_reference` at `/odoo/employees/6` for Abigail Peterson.
- Create User opened at both viewports with Name `Abigail Peterson`, Login
  `abigail.peterson39@example.com`, and work phone defaults.
- Raw results: `odoo-browser.json` and per-viewport JSON files.
- Seven app-icon 404s from unrelated installed modules were observed at both
  viewports and are recorded as shell noise; no page errors were observed.

## Disposition

The Core3 fixture-company mismatch prevents a populated Core3 employee-form
comparison, so this is conditional bounded evidence only. The durable contract,
permission/concurrency guards, restart behavior, and Odoo modal comparison are
verified; no aggregate Employees sign-off is claimed.
