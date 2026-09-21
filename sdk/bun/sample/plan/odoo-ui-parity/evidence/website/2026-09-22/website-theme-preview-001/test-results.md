# Test results

- `bun test ./test/website_theme_preview.integration.test.ts --timeout 20000`
  — 3 tests, 21 assertions, pass.
- `bun test ./test/website_themes.integration.test.ts ./test/website_theme_preview.integration.test.ts ./test/website_public.integration.test.ts --timeout 20000`
  — 11 tests, 77 assertions, pass.
- `git diff --check` — pass before commit.

The full Website glob was not used for sign-off because unrelated concurrent
module edits are present in the shared checkout; the exact module-scoped tests
above are the reproducible result for this change.
