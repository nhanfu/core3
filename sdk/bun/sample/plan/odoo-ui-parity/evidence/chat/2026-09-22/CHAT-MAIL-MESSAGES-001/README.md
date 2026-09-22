# CHAT-MAIL-MESSAGES-001

Bounded Odoo Mail parity slice: Technical → Discuss → Messages.

Core3 implementation:

- `/chat/messages` and `/chat/messages/detail`
- page/API YAML joined by `page.id`
- technical message metadata migration over durable Chat message rows
- `chat.technical` permission boundary
- searchable list, read-only detail form, empty/no-results, and missing-record contracts

Browser evidence status is recorded in [browser-check.md](browser-check.md).
See [source-comparison.md](source-comparison.md), [functionality-checklist.md](functionality-checklist.md), and [test-results.md](test-results.md).
