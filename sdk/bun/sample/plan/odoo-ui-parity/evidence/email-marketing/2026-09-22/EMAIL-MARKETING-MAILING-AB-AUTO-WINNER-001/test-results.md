# Test results

Executed from `sdk/bun/sample` on 2026-09-22:

- `bun test ./test/email_marketing_mailing_ab_auto_winner.integration.test.ts --timeout 20000` — **4 passed, 0 failed, 17 assertions**.
- `bun run css:build:email-marketing` — **passed**.
- `bun run audit` — **passed**, 852 pages, 860 routes, and 1,792 datasources.
- `git diff --check` — **passed**.

The existing worktree also contains unrelated concurrent Chat, Events, Live
Chat, and Spreadsheet changes. A broader Email Marketing test batch encountered
those dirty-worktree discovery errors and a temporary filesystem exhaustion
during isolated-copy setup; no unrelated files were changed for this slice.
