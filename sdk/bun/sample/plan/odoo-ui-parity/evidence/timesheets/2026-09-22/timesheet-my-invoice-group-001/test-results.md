# Test results

The focused command is:

```text
bun test test/timesheets_my_invoice_group.integration.test.ts
```

Result: 4 tests passed, 0 failed, 19 assertions.

The related My Timesheets glob reached 38 passing tests and 1 failure in the
pre-existing shared page discovery boundary (`actions[7].success_message is not
allowed`); the new focused test is independent and passes.
