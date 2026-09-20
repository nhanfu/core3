# EMP-VISA-WORK-PERMIT-001 verification

Date: 2026-09-21

## Source and contract

- Odoo source: `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py` and
  `views/hr_employee_views.xml`.
- The Personal-tab group exposes Visa No, Visa expiration, Work Permit No, Work
  Permit expiration, and the Work Permit document widget.
- Core3 page/API separation is `pages/employee-detail.yaml` and
  `api/employee-detail.yaml`, joined by `page.id: employee-detail`.
- Durable migration: `services/employees/migrations/20260921120000-042-employee-visa-work-permit.yaml`.

## Verification

- `bun test test/employees_visa_work_permit.integration.test.ts`: **4 pass,
  23 assertions**.
- `bun test test/employees_*.integration.test.ts`: full Employees glob completed
  green.
- `bun run audit`: **692 pages, 701 routes, 1,294 datasources**, passed.
- `bunx eslint test/employees_visa_work_permit.integration.test.ts`: passed.
- `git diff --check`: passed.

## Authenticated browser evidence

- Core3: `core3-desktop.png/json` at 1440x900 and `core3-mobile.png/json` at
  390x844. Both authenticate as Admin User, load the employee page with HTTP
  200, and render all six new labels without browser errors. The page values are
  empty because the session company is `Core3 Demo Company` and deterministic
  employee fixtures are `Core3 Vietnam`; this proves the company guard rather
  than populated-value parity.
- Odoo: `odoo-desktop.png/json` at 1440x900 and `odoo-mobile.png/json` at
  390x844. Both authenticate, reach Abigail Peterson's Personal tab, and show
  Visa No, Work Permit No, Document, and Upload your file. Seven unrelated
  app-icon 404s are captured in both JSON records.

## Blockers and boundaries

- Core3 authenticated fixture-company mismatch prevents populated Core3 values
  in this runtime; no UI sign-off is claimed.
- Odoo's `has_work_permit` is a binary attachment widget. This bounded slice
  persists document presence and filename metadata only; binary upload/download
  is an explicit follow-up feature, not claimed here.
