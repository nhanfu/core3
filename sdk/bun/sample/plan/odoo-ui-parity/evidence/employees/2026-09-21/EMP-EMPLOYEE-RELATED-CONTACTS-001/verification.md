# EMP-EMPLOYEE-RELATED-CONTACTS-001 verification

Date: 2026-09-21

- Focused integration: `employees_related_contacts.integration.test.ts` — 4
  tests, 23 assertions, pass.
- Full Employees integration matrix: 247 tests, 1,810 assertions, pass across
  65 files.
- Employees API fragment validation: pass. The page/API contracts share
  `page.id: employee-detail`; page YAML contains only UI bindings.
- Scoped ESLint for the feature and Work-tab contract: pass.
- Shared UI audit: pass — 741 pages, 750 routes, 1,467 datasources.
- Odoo source comparison: `hr.employee.action_related_contacts` and the
  Contacts smart button were mapped to the durable work-contact relation.
- Odoo browser attempt: local Odoo was reachable, but `admin/admin` was
  rejected at desktop and mobile. See `odoo-browser.json` and `odoo-*.png`.
- Core3 browser attempt: authentication and both desktop/mobile employee
  routes loaded without request or page failures. The Work Contact field was
  visible, but the Contacts smart button/value was absent because the seeded
  employee/contact relation is not visible under the authenticated company
  guard (`company-demo` versus the deterministic employee/company labels).
  See `core3-browser.json` and `core3-*.png`.

No aggregate Employees sign-off is claimed.
