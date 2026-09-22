# EXPENSE-FUNC-016 test results

Focused command:

```text
bun test test/expenses_split.integration.test.ts --timeout 20000
6 pass, 0 fail, 21 assertions
```

Expenses regression command:

```text
bun test test/*expense*.integration.test.ts --timeout 30000
60 pass, 0 fail, 325 assertions across 17 files
```

Additional gates:

- `bun run audit` — passed, 840 pages / 848 routes / 1,750 datasources.
- `bun run css:build:expenses` — passed.
- `bun run frontend:build` — passed.
- `bunx eslint test/expenses_split.integration.test.ts` — passed.
- `git diff --check` — passed.
