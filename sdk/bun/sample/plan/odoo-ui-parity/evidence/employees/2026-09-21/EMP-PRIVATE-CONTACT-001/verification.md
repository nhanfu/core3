# EMP-PRIVATE-CONTACT-001 verification

Date: 2026-09-21

## Source and contract

- Odoo source: `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py` and
  `views/hr_employee_views.xml`.
- The Personal-tab Private Contact group exposes `private_email` and
  `private_phone`.
- Core3 page/API separation is `pages/employee-detail.yaml` and
  `api/employee-detail.yaml`, joined by `page.id: employee-detail`.
- Durable migration: `services/employees/migrations/20260921150000-045-employee-private-contact.yaml`.

## Verification

- `bun test test/employees_private_contact.integration.test.ts`: **4 pass,
  18 assertions**.
- `bun run audit`: **694 pages, 703 routes, 1,306 datasources**, passed.
- `bunx eslint test/employees_private_contact.integration.test.ts`: passed.
- `git diff --check`: passed.

## Authenticated browser evidence

- Core3: `core3-desktop.png/json` at 1440x900 and `core3-mobile.png/json` at
  390x844. Both authenticate as Admin User, load the employee page with HTTP
  200, render Private Email/Private Phone and related contact labels, and have
  no browser errors. Values are empty because the session company is
  `Core3 Demo Company` while deterministic fixtures are `Core3 Vietnam`.
- Odoo: `odoo-desktop.png/json` at 1440x900 and `odoo-mobile.png/json` at
  390x844. Both authenticate, reach Abigail Peterson's Personal tab, and show
  the source Private Contact group with Email and Phone. Seven unrelated
  app-icon 404s are captured in both JSON records.

## Blockers and boundaries

- Core3 populated-value comparison is company-blocked; no aggregate UI sign-off
  is claimed.
- The pre-existing generic `phone` projection remains for compatibility; the
  Odoo Private Contact group now uses source-named `private_phone` explicitly.
