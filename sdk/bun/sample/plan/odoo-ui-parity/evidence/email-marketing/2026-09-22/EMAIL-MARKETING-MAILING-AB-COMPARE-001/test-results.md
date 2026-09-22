# Test results

Executed from `sdk/bun/sample` on 2026-09-22:

- `bun test ./test/email_marketing_mailing_ab_compare.integration.test.ts --timeout 20000` — **3 passed, 0 failed, 23 assertions**.
- `bun test ./test/email_marketing*.integration.test.ts --timeout 20000` — **54 passed, 16 failed, 504 assertions** across 70 tests. Every failure is discovery-time and reports the unrelated concurrent Inventory error `components[0].stat_buttons[3].value_field must be a non-empty string`; no Inventory file was changed.
- `bun run css:build:email-marketing` — **passed**.
- `bun run frontend:build` — **passed**.
- `bun run audit` — **blocked** by the same unrelated Inventory page-schema error before audit counts are produced.
- `git diff --check` — **passed** after implementation and documentation edits.
