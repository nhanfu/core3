# EMP-EMPLOYEE-ARCHIVE-RELATION-CLEANUP-001 evidence

Date: 2026-09-21

This slice follows Odoo `hr.employee.action_archive()` and
`_get_employee_m2o_to_empty_on_archived_employees()` in
`/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py`. It archives the
selected employee and atomically clears same-company manager/coach references
from active employees and their active Employee Records projections.

Verification:

- `test/employees_archive_relation_cleanup.integration.test.ts`: 4 tests,
  30 assertions, pass.
- Adjacent scoped run: 25 tests passed, 1 pre-existing discovery failure, 214 assertions attempted.
- Core3 browser capture is conditional. Core3 did not start because shared
  discovery rejects an existing Employees page component with
  `components[1].title is not allowed`; desktop and mobile probes record
  `ERR_CONNECTION_REFUSED` after that startup failure in
  `core3-browser.json`.
- Odoo desktop/mobile login pages were captured, but `admin/admin` was
  rejected (`Wrong login/password`) and the second probe was rate limited
  (`Too many login failures`). No authenticated comparison or sign-off is
  claimed.

Artifacts: `core3-browser.json`, `odoo-browser.json`, Odoo login screenshots,
and the bounded source/runtime captures in this directory.
