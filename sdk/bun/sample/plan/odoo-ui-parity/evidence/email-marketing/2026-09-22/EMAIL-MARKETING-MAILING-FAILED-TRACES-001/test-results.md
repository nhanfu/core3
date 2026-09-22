# Test results

- Focused: `bun test ./test/email_marketing_mailing_failed_traces.integration.test.ts --timeout 20000` — **3 passed, 0 failed, 17 assertions**.
- Module: `bun test --reporter=dots ./test/email_marketing_*.integration.test.ts --timeout 20000` — **77 passed, 0 failed, 645 assertions across 22 files**.
- `bun run css:build:email-marketing` — passed.
- `bun run frontend:build` — passed.
- `bun run audit` — passed: 854 pages, 862 routes, 1,806 datasources.
- `git diff --check` — passed.

Only Email Marketing implementation/test/evidence files were staged; unrelated
concurrent changes remain unstaged.
