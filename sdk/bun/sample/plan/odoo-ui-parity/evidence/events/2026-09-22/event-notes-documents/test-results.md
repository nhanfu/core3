# Test results

Command:

`bun test test/events_notes_documents.integration.test.ts test/events.integration.test.ts --timeout 20000`

Result: **9 passed, 0 failed, 70 assertions**.

Coverage includes source/page/API contract mapping, matching page ids, durable
note/instruction updates, row-version stale rejection, invalid-value guards,
upload/remove, download content bytes, and metadata persistence after closing
and reopening DuckDB. Core3 memory-mode startup also reached backend, Vite,
and event-mediator readiness in the checkpoint.
