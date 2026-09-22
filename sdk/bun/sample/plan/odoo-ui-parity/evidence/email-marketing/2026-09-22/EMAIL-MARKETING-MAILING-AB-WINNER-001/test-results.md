# Test results

Focused command:

```text
bun test ./test/email_marketing_mailing_ab_winner.integration.test.ts --timeout 20000
```

Result: **4 passed, 0 failed, 20 expect() calls**.

The suite covers page/API discovery, Odoo source action mapping, idempotent
migrations, two sent variants, stable winner creation, queue state, 100%
audience, group completion, stale/missing/incomplete/non-manual/inactive and
duplicate guards, and the write permission.

Module regression: `bun test ./test/email_marketing*.integration.test.ts
--timeout 20000` — **67 passed, 0 failed, 588 assertions** across 19 files.

Repository gates:

- `bun run audit` — pass, 829 pages, 837 routes, 1,728 datasources.
- `bun run css:build:email-marketing` — pass.
- `bun run frontend:build` — pass, including all CSS builds and Vite.
- `git diff --check` — pass.
- Scoped ESLint for the two changed Email Marketing integration tests — pass.
