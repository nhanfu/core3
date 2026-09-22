# CHAT-SCHEDULED-MESSAGES-001

Bounded Odoo Mail parity slice: Technical → Discuss → Scheduled Messages.

Core3 implementation:

- `/chat/scheduled-messages` and `/chat/scheduled-messages/detail`
- page/API YAML joined by `page.id`
- durable `chat_message_schedules` migration and deterministic fixtures
- `chat.technical` permission boundary
- edit, stale-date, missing-record, and Force Send queue-removal guards

Browser evidence is blocked. The authenticated Odoo tab was already borrowed
by another BrowserSkill session, so this directory intentionally contains no
desktop/mobile screenshot and makes no visual-parity claim.

See [source-comparison.md](source-comparison.md), [functionality-checklist.md](functionality-checklist.md),
[test-results.md](test-results.md), and [browser-check.md](browser-check.md).
