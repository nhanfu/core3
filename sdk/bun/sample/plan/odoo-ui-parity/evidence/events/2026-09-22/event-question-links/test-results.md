# Test results

Command:

	bun test test/events_event_question_links.integration.test.ts --timeout 20000

Result: **3 passed, 0 failed, 23 assertions**.

Coverage includes Odoo source/page/API mapping, matching page IDs, seeded
event-question links, already-linked option filtering, permission metadata,
attach/edit/detach mutations, duplicate and stale guards, and persistence
after closing and reopening DuckDB.
