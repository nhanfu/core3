# Verification

- Focused feature test: `bun test test/employees_properties.integration.test.ts`
  — **4 pass, 19 assertions**.
- Adjacent regression: `bun test test/employees_properties.integration.test.ts
  test/employees_coach.integration.test.ts` — **8 pass, 42 assertions**.
- UI audit: `bun run audit` — pass, **714 pages / 723 routes / 1,364
  datasources**.
- Scoped lint: `bunx eslint test/employees_properties.integration.test.ts
  test/employees_coach.integration.test.ts` — pass.
- Diff check: `git diff --check` on Employees and owned parity paths — pass.

The normal Core3 runtime was attempted with `bun dev --db=ddb --memory`.
Frontend/Vite responded on port 3002, but the backend did not bind port 3001
within the bounded startup poll. The isolated Employees agent reported
`PageSchemaError: actions[2].fields must be a non-empty array`; direct
Employees API YAML validation and the repository UI audit pass, so no other
module was modified to work around the runtime blocker.
