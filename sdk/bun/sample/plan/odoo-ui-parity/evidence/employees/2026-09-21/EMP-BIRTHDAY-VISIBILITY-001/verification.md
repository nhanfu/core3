# EMP-BIRTHDAY-VISIBILITY-001 verification

- Source: Odoo `hr.employee.birthday_public_display`, computed
  `birthday_public_display_string`, and the Personal Information checkbox in
  `hr_employee_views.xml`; the public kanban consumes the computed value.
- Contracts: `services/employees/pages/employee-detail.yaml` and
  `services/employees/api/employee-detail.yaml` remain joined by `page.id`;
  directory page/API contracts expose only the opted-in day/month.
- Persistence: migration `20260921160000-046-employee-birthday-visibility.yaml`
  adds the durable field, seeds deterministic dates/visibility, and is replay
  safe.
- Focused verification: `bun test test/employees_birthday_visibility.integration.test.ts`
  passed **4 tests / 22 assertions**. Scoped ESLint and `git diff --check`
  passed.
- Authenticated Core3 desktop/mobile evidence: `core3-desktop.png`,
  `core3-mobile.png`, `core3-directory-desktop.png`, and
  `core3-directory-mobile.png`, with HTTP 200 API responses and no page errors.
  The fixture row is hidden because the session company is `Core3 Demo Company`
  while deterministic fixtures are `Core3 Vietnam`.
- Authenticated Odoo desktop/mobile evidence: `odoo-desktop.png` and
  `odoo-mobile.png`; Abigail Peterson's Personal tab renders Birthday, but has
  no birthday value, so Odoo's source-controlled visibility checkbox is hidden.
- Browser metadata is in `browser.json`. Browser aborts are navigation cleanup,
  not feature failures; no aggregate Employees sign-off is claimed.
