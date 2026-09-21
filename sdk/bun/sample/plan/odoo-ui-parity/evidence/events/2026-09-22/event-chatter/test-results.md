# Test results

Commands ran from `/home/nhanjs/projects/core3/sdk/bun/sample`:

- `bun test test/events_chatter.integration.test.ts --timeout 20000` — **PASS**, 4 tests / 25 assertions.
- Related bounded regression (`events.integration`, `events_activity`,
  `events_notes_documents`, `events_event_question_links`, and chatter) —
  **PASS**, 19 tests / 138 assertions.
- `bun run audit` — **PASS**, 807 pages / 816 routes / 1,671 datasources.
- `bun run css:build:events` — **PASS**.
- Targeted ESLint for changed Events tests — **PASS**.
- `git diff --check` — **PASS**.

The full `test/events*.integration.test.ts` corpus was also invoked during
finalization; its long output was not retained as a concise summary before the
requested commit handoff. The focused and related bounded results above are
the authoritative retained result for this feature.
