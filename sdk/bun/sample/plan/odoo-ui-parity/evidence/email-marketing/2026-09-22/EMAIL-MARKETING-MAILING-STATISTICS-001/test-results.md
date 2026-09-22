# Test results

- Focused: `bun test ./test/email_marketing_mailing_statistics.integration.test.ts --timeout 20000` — **3 passed, 0 failed, 24 assertions**.
- Email Marketing regression: `bun test --reporter=dots ./test/email_marketing_*.integration.test.ts --timeout 20000` — **80 passed, 0 failed, 669 assertions across 23 files**.
- UI audit: `bun run audit` — **passed**, 865 pages, 873 routes, 1,828 datasources.
- Email Marketing Sass: `bun run css:build:email-marketing` — **passed**.
- `git diff --check` — release gate run after documentation and code changes.

No screenshots are committed; authenticated visual proof is recorded as
blocked in `browser-check.md`.
