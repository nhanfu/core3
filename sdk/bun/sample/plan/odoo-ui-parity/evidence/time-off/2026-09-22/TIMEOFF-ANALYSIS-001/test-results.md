# Test results

Focused command:

```text
bun test test/time_off_analysis.integration.test.ts
3 pass, 0 fail, 17 expect() calls
```

The focused tests cover contract/page-id separation, Graph/Pivot configuration,
signed allocation/request rows, employee/department/status/date filtering,
empty state, 503 declaration, migration replay, seeded report metadata, and
both durable report indexes.

The Time Off glob was also run. It reached 71 tests and 522 assertions, with
62 passing and 9 existing discovery failures from unrelated page-schema errors
(`components[0].search.type` / `description...`) in other Time Off pages. The
new analysis test and the existing navigation assertions pass. The failure
paths are recorded rather than masked.
