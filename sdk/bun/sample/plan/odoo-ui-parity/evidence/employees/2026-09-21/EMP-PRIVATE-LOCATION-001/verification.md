# EMP-PRIVATE-LOCATION-001 verification

Date: 2026-09-21

## Source and contract

- Odoo source: `/home/nhanjs/projects/odoo/addons/hr/models/hr_version.py` and
  `views/hr_employee_views.xml`.
- The Personal-tab Location group exposes structured private address and
  home-to-work distance/unit fields.
- Core3 page/API separation is `pages/employee-detail.yaml` and
  `api/employee-detail.yaml`, joined by `page.id: employee-detail`.
- Durable migration: `services/employees/migrations/20260921140000-044-employee-private-location.yaml`.

## Verification

- `bun test test/employees_private_location.integration.test.ts`: **4 pass,
  23 assertions**.
- `bunx eslint test/employees_private_location.integration.test.ts`: passed.
- `git diff --check`: passed.
- `bun run audit`: blocked before discovery by the unrelated Inventory schema
  error below; no Inventory files were changed.
- Full Employees glob: new private-location tests pass, but discovery-based
  tests are blocked by the same shared Inventory schema error.

## Authenticated browser evidence

- Odoo: `odoo-desktop.png/json` at 1440x900 and `odoo-mobile.png/json` at
  390x844. Both authenticate, reach Abigail Peterson's Personal tab, and show
  the Location, Private Address, and Home-Work Distance source labels. Seven
  unrelated app-icon 404s are captured in both JSON records.
- Core3: no authenticated capture is claimed because the Employees runtime
  cannot start while shared page discovery fails.

## Blockers and boundaries

- Exact shared blocker: `PageSchemaError: Invalid page definition:
  components[1].search.lots is not allowed; components[1].search.or packages...
  is not allowed`.
- The error is in another owner's Inventory page and was left untouched.
- `private_state_id` and `private_country_id` are visible-name projections until
  the shared country/state catalogs are available; no catalog sign-off is
  claimed.
