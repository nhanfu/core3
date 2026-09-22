# Test results

Executed from `sdk/bun/sample` on 2026-09-22:

- `bun test ./test/email_marketing_utm_campaigns.integration.test.ts --timeout 20000` — **4 passed, 0 failed, 33 assertions**.
- `bun test ./test/email_marketing*.integration.test.ts --timeout 20000 --reporter=dots` — **63 passed, 0 failed, 568 assertions** across 18 files.
- `bun run audit` — **passed**, 824 pages, 832 routes, 1,715 datasources.
- `bun run css:build:email-marketing` — passed.
- `bun run frontend:build` — passed.
- `bun run audit:yaml` — unavailable because the sample package has no `audit:yaml` script (`Script not found "audit:yaml"`).
- `git diff --check` — passed before evidence documentation.
