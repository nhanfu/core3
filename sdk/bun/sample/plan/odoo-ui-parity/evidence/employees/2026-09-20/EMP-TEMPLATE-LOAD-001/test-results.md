# Test results

- Focused: `bun test ./test/employees_template_load.integration.test.ts
  --timeout 20000` — **4 passed, 26 assertions**.
- Full Employees: `bun test ./test/employees*.integration.test.ts
  --timeout 20000` — **75 passed, 817 assertions**.
- Audit: `bun run scripts/audit-order-ui.ts` — **671 pages, 680 routes,
  1,216 datasources**, passed.
- Scoped ESLint on the changed Employees tests — passed.
- Scoped `git diff --check` — passed.
