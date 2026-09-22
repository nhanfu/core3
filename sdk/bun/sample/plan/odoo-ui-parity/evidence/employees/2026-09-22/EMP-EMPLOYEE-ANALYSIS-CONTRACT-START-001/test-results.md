# Test results

Command:

```text
bun test test/employees_analysis_contract_start.integration.test.ts --timeout 20000
```

Result: **3 passed, 0 failed, 18 assertions**.

The suite covers source mapping, page/API separation, durable contract-start
rows, employee-count projection, company scope, migration replay, and
file-backed restart.

Adjacent regression command:

```text
bun test test/employees.integration.test.ts test/employees_analysis_contract_start.integration.test.ts --timeout 20000
```

Result: **17 passed, 0 failed, 200 assertions**.

The complete Employees sweep reached **330 passed / 4 failed / 2,302
assertions**. The bounded slice's direct action-mode assertion was updated and
passes; the remaining three failures are pre-existing assertions for already
landed Work Location Type, Work Permit Activity, and Skill Assignments
contracts, outside this slice.
