# Test results

- `bun test ./test/website_themes.integration.test.ts --timeout 20000`
  — 6 tests, 35 assertions, pass.
- `bun test ./test/website*.integration.test.ts --timeout 20000`
  — 33 tests, 180 assertions, pass.
- `bun run frontend:build` — pass; CSS and Vite production build completed
  without warnings.
- `git diff --check` — pass before final commit.

The full Website suite result is recorded after the final focused run in the
module QA ledger and commit handoff.
