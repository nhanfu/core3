# EXPENSE-FUNC-014 test results

Focused command:

```text
bun test test/expenses_employee_action.integration.test.ts --timeout 20000
2 pass, 0 fail, 10 assertions
```

Assertions cover YAML page/API separation, exact view order, pivot defaults,
page discovery, approved/to-pay scope, all-scope status/payment filtering,
stable output fields, empty search, and `EXPENSE_EMPLOYEE_UNAVAILABLE`.
