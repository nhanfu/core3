# EMP-PRINT-BADGE-001

Bounded Employees slice: Odoo employee Print Badge report.

Odoo declares `hr_employee_print_badge` as a `qweb-pdf` report bound to
`hr.employee`. Its template prints the employee name, job, image/company
branding, and barcode. Core3 implements the workflow with a page/API-separated
print action from the employee detail, a dedicated printable badge page, and a
durable `employee_badge_print_runs` history table.

The report action is read-gated by `employees.read` and its server mutation
requires an authenticated actor, current-company employee, non-empty barcode,
matching row version, actor identity, and company identity. The migration is
idempotent and report history survives replay and file-backed restart.

Core3 browser capture is an exact blocker: the isolated runtime cannot load
the authenticated page because the shared checkout's Auth YAML action schema
fails first (`actions[0].action` and `actions[0].refresh` are not allowed).
Desktop and mobile blocker captures are included; no Core3 UI pass is claimed.

Authenticated Odoo desktop/mobile Settings captures show Badge ID and Print
Badge after generating the source badge. A desktop click also produced the
real `Badge - Abigail Peterson.pdf` download. Odoo asset/avatar 404s observed
in the mobile session are unrelated to the Print Badge control and are listed
in the JSON evidence.

Artifacts include source comparison, functionality checklist, exact Core3
blocker, Odoo observations, screenshots, and verification results.
