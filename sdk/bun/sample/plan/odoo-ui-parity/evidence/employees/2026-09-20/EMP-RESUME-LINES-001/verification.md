# Verification

- `bun test test/employees_resume_lines.integration.test.ts`: **4 pass, 30
  assertions**.
- `bun run audit`: **687 pages, 696 routes, 1,279 datasources**; passed.
- Scoped ESLint for `test/employees_resume_lines.integration.test.ts`: passed
  with no warnings.
- Scoped `git diff --check`: passed.
- Full-repository regression was intentionally not run. No aggregate Employees
  sign-off is claimed.
