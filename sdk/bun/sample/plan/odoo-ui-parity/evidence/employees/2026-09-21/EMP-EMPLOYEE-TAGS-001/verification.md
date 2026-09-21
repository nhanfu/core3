# EMP-EMPLOYEE-TAGS-001 verification

## Focused checks

- `bun test test/employees_tags.integration.test.ts test/employees_employee_work_tab.integration.test.ts`: **7 pass, 0 fail, 45 assertions**.
- The tag suite covers Odoo source mapping, deterministic tag options, add/remove CRUD, actor/current-company/stale/unsupported/duplicate/missing-relation guards, migration replay, and file-backed restart.
- Full Employees glob: **210 pass, 3 fail, 1506 assertions** across 59 files. The three failures are pre-existing contract expectations outside this slice: Visa/Work Permit expects only `has_work_permit` in `boolean_fields`; Work tab expected the pre-tags field list (repaired in this slice); Birth Identity expected the pre-existing Personal Information field list. After the owned Work tab expectation was updated, the bounded slice is green; Visa and Birth Identity remain unrelated baseline failures.

## Authenticated browser evidence

- Odoo login succeeded as the local QA actor at `http://127.0.0.1:8069`, then captured `/odoo/employees/1` at 1440x1100 and 390x844. The source form contains `category_ids` with `many2many_tags`, but the selected Mitchell Admin fixture has no populated tag chips in the rendered form; this is recorded as a fixture visibility limitation, not a parity sign-off.
- Core3 login succeeded as `admin@tms.local` against the bounded `bun dev --db=ddb --memory` runtime. Desktop/mobile employee-detail captures show the new Tags tab and page/API UI contract. The authenticated company is `Core3 Demo Company`, while deterministic Employee fixtures are `Core3 Vietnam`; the detail therefore renders guarded empty projections. This is the explicit company-fixture blocker.
- Core3 runtime and Vite were stopped after capture; no listener remains on ports 3001, 3002, or 3010.

## Scoped status

The durable API/page contract and focused persistence/permission/concurrency tests pass. No aggregate Employees sign-off is claimed because populated cross-system tag values were not available in both authenticated fixtures.
