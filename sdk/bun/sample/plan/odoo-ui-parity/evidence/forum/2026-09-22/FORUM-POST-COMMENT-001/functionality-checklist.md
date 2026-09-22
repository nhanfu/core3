# Functionality checklist

| Case | Result |
| --- | --- |
| YAML page/API join uses `page.id: forum-question-detail` | pass |
| Deterministic seeded question comment is listed | pass |
| Authenticated question comment creates durable content and actor | pass |
| Authenticated active/accepted answer comment creates durable relation | pass |
| Parent `last_activity_at` and row versions update atomically | pass |
| Blank content and missing actor are rejected | pass |
| Closed question and flagged answer are rejected without a row | pass |
| Migration reapply and file-backed restart preserve comments | pass |
| Direct HTTP action requires `forum.write` | pass |
| Odoo/Core3 authenticated desktop/mobile visual pairing | blocked: `website_forum` absent in `core3_reference` |
