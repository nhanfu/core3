# Test results

- `bun test ./test/blog_post_seo.integration.test.ts --timeout 20000` — 4
  tests, 32 assertions, 0 failures.
- `bun test ./test/blog*.integration.test.ts --timeout 20000` — 56 tests, 339
  assertions, 0 failures.
- `bun run audit` — 865 pages, 873 routes, 1,829 datasources; passed.
- `bun run css:build:blog` — passed.
- `bunx eslint test/blog_post_seo.integration.test.ts` — passed.
- `git diff --check` — passed before commit.
