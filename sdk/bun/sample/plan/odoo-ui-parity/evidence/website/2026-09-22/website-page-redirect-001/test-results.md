# Test results

- `bun test ./test/website_page_redirect.integration.test.ts --timeout 20000`
  — 3 tests, 13 assertions, pass.
- Adjacent regression set (`website_page_redirect`, `website_pages`,
  `website_page_detail_publish`, `website_settings`,
  `website_favicon_settings`, `website_cookie_consent_settings`) — 26 tests,
  131 assertions, pass.
- `bun run audit` — pass: 853 pages, 861 routes, 1,797 datasources.
- `bun run css:build:website` — pass.
- `git diff --check` — pass.
