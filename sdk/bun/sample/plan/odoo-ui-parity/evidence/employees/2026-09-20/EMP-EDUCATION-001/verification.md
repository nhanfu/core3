# Verification

- Focused: `bun test test/employees_education.integration.test.ts` — 4 pass,
  21 assertions.
- Full Employees: 75 pass, 12 fail, 748 assertions; failures are existing
  shared page discovery errors: `actions[0].title is not allowed`.
- Merged employee-detail page/API schema: pass.
- Scoped ESLint and `git diff --check`: pass.
- `bun run audit`: blocked by the same shared discovery error.
