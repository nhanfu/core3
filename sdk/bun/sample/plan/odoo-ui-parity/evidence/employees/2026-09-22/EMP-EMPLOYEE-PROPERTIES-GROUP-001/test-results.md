# EMP-EMPLOYEE-PROPERTIES-GROUP-001 test results

Focused command:

```text
bun test test/employees_properties_group.integration.test.ts --timeout 30000
```

Result: **2 tests passed, 11 assertions, 0 failures**.

Adjacent regression command:

```text
bun test test/employees_properties_group.integration.test.ts test/employees_properties.integration.test.ts --timeout 30000
```

Result: **6 tests passed, 30 assertions, 0 failures**. The broader
Employees-list regression covering Properties, Birthday, My Team/My
Department, Newly Hired, Contract status, contract-start analysis, and
organization chart passed **25 tests, 123 assertions, 0 failures**.

Repository checks:

- `git diff --check` passed for the scoped Employees/evidence paths.
- `bun run frontend:build` passed with exit 0.
- `bun run audit` is blocked during global discovery by the unrelated existing
  page-schema error `components[0].views[1].group_by is required for kanban`.
