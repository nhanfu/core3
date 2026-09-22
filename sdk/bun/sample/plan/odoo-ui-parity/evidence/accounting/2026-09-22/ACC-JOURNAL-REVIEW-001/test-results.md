# Test results

- `bun test ./test/accounting_journal_entry_review.integration.test.ts --timeout 20000` — **3 passed, 28 assertions, 0 failures**.
- Coverage includes page/API separation, local Odoo action/model mapping,
  permission metadata, posted-only transition, missing/stale/duplicate guards,
  atomic row-version increment, file-backed restart, and migration replay.
- `git diff --check` — passed for the implementation and evidence paths.
- `bun run audit` — passed, 837 pages, 845 routes, and 1,747 datasources.
- `bun run frontend:build` — passed through the Accounting Sass bundle and Vite build.
