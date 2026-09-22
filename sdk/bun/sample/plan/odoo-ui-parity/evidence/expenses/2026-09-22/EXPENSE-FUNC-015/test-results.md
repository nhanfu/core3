# EXPENSE-FUNC-015 test results

Focused command:

```text
bun test test/expenses_accounting_link.integration.test.ts test/expenses_migrations.integration.test.ts --timeout 20000
4 pass, 0 fail, 15 assertions
```

Expenses regression command:

```text
bun test ./test/expenses*.integration.test.ts --timeout 20000
55 pass, 0 fail, 297 assertions across 16 files
```

Additional gates:

- `bun run audit` — passed, 834 pages / 842 routes / 1,740 datasources.
- `bun run css:build:expenses` — passed.
- `bun run frontend:build` — passed.
- `git diff --check` — passed after final diff review.
