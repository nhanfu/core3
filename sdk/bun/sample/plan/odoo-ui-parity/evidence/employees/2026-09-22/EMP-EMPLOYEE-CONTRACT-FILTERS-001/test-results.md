# Test results

- Focused: `bun test test/employees_contract_filters.integration.test.ts` —
  **3 pass / 22 assertions**.
- Adjacent regression: contract period, New Contract, Newly Hired, and My
  Team/My Department — **17 pass / 105 assertions**.
- `bun run audit` — **807 pages / 816 routes / 1,671 datasources, pass**.
- Scoped ESLint — pass.
- Full lint remains blocked by four unrelated existing errors in Accounting,
  Blog, Inventory, and Purchase tests.
