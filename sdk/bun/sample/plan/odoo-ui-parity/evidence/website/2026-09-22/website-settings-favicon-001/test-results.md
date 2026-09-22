# Test results

- `bun test ./test/website_favicon_settings.integration.test.ts --timeout 20000`
  — 4 tests, 20 assertions, pass.
- `bun test ./test/website_settings.integration.test.ts --timeout 20000`
  — 4 tests, 21 assertions, pass.

The focused tests cover page/API separation, upload/download bytes, invalid
input, stale writes, permission denial, migration replay, and DuckDB restart.
