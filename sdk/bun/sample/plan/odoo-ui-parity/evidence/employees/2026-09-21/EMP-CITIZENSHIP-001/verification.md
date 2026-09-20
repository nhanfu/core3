# EMP-CITIZENSHIP-001 verification

Date: 2026-09-21

## Source and contract

- Odoo source: `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py` and
  `views/hr_employee_views.xml`.
- The Personal-tab Citizenship group exposes nationality, identification, SSN,
  passport, and passport expiration fields.
- Core3 page/API separation is `pages/employee-detail.yaml` and
  `api/employee-detail.yaml`, joined by `page.id: employee-detail`.
- Durable migration: `services/employees/migrations/20260921130000-043-employee-citizenship.yaml`.

## Verification

- `bun test test/employees_citizenship.integration.test.ts`: **4 pass,
  21 assertions**.
- `bun test test/employees_*.integration.test.ts`: full Employees glob completed
  green.
- `bun run audit`: **692 pages, 701 routes, 1,294 datasources**, passed.
- `bunx eslint test/employees_citizenship.integration.test.ts`: passed.
- `git diff --check`: passed.

## Authenticated browser evidence

- Core3: `core3-desktop.png/json` at 1440x900 and `core3-mobile.png/json` at
  390x844. Both authenticate as Admin User, load the employee page with HTTP
  200, and render all five new labels without browser errors. Values are empty
  because the session company is `Core3 Demo Company` and deterministic
  employee fixtures are `Core3 Vietnam`.
- Odoo: `odoo-desktop.png/json` at 1440x900 and `odoo-mobile.png/json` at
  390x844. Both authenticate, reach Abigail Peterson's Personal tab, and show
  Citizenship, Nationality (Country), Identification No, SSN No, and Passport
  No. Seven unrelated app-icon 404s are captured in both JSON records.

## Blockers and boundaries

- Core3 authenticated fixture-company mismatch prevents populated values in this
  runtime; no UI sign-off is claimed.
- Odoo's `country_id` is a many2one country relation. Core3 stores the visible
  country name as `country_id` until a shared country catalog is available; this
  source-backed projection boundary is explicit.
