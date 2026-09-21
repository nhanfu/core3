# EMP-EMPLOYEE-TIMEZONE-001 verification

## Focused checks

- `bun test test/employees_timezone.integration.test.ts`: **4 pass, 0 fail, 19 assertions**.
- Combined regression `bun test test/employees_timezone.integration.test.ts test/employees_tags.integration.test.ts test/employees_employee_work_tab.integration.test.ts`: **11 pass, 0 fail, 64 assertions**.
- The timezone suite covers Odoo source mapping, employee create/update, deterministic fixtures, actor/current-company/stale/unsupported guards, migration replay, and file-backed restart.
- YAML parse, scoped ESLint, UI audit, and `git diff --check` are recorded at finalization.

## Authenticated browser evidence

- Odoo login succeeded as the local QA actor at `http://127.0.0.1:8069`; desktop 1440x1100 and mobile 390x844 captures opened `/odoo/employees/1` and the Settings tab. The authenticated Mitchell Admin fixture exposes a visible `[name="tz"]` control, but its empty/default value has no rendered timezone label in body text; this is a fixture-value limitation, not a sign-off claim.
- Core3 was attempted with `bun dev --db=ddb --memory`. Vite reached readiness, but global page discovery stopped before backend bind on the unrelated shared error `actions[1].fields is not allowed`. No Core3 screenshot or UI pass is claimed for this slice.
- The failed Core3 process exited; no runtime process is intentionally retained.

## Scoped status

Durable create/update, permission, concurrency, migration, and restart behavior
passes. Browser comparison is conditional because Core3 discovery is blocked
outside Employees and the Odoo reference fixture has no populated timezone
value. No aggregate Employees sign-off is claimed.
