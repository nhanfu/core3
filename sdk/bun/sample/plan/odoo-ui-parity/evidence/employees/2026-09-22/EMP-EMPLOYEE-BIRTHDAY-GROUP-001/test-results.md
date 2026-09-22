# EMP-EMPLOYEE-BIRTHDAY-GROUP-001 test results

Focused command:

```text
bun test test/employees_birthday_group.integration.test.ts --timeout 30000
```

Result: **2 tests passed, 9 assertions, 0 failures**.

Adjacent regression command:

```text
bun test test/employees_birthday_group.integration.test.ts test/employees_birthday_visibility.integration.test.ts test/employees_analysis_contract_start.integration.test.ts --timeout 30000
```

Result: **9 tests passed, 49 assertions, 0 failures**. The test covers Odoo
source mapping, page/API `page.id` separation, birthday projection,
current-company filtering, and deterministic demo values. No schema migration
was added because the existing birthday migration owns the column and fixtures.

Repository checks: `bun run audit` passed with 847 pages, 855 routes, and
1,780 datasources; `bun run frontend:build` passed; `git diff --check` passed.
