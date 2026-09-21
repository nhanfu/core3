# Test results

All commands were run from `/home/nhanjs/projects/core3/sdk/bun/sample`.

- `bun test test/events_activity.integration.test.ts --timeout 20000`
  **PASS** — 3 tests, 20 assertions.
- `bun test test/events_activity.integration.test.ts test/events.integration.test.ts test/events_notes_documents.integration.test.ts test/events_event_question_links.integration.test.ts --timeout 20000`
  **PASS** — 15 tests, 113 assertions.
- `bun run audit` **PASS** — 797 pages, 806 routes, 1,644 datasources.
- `git diff --check` **PASS**.
- `bun run css:build:events` **PASS**.

The focused test covers source mapping and page/API ownership, datasource and
action permissions, schedule/complete guards, and file-backed restart/replay.
The authenticated browser flow additionally scheduled `Review event logistics`,
reloaded the detail, marked it done, and observed the completed activity.
