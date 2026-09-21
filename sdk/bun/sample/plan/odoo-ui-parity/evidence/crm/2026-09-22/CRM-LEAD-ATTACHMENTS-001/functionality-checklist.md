# Functionality checklist

| Case | Result | Evidence |
| --- | --- | --- |
| Separate page/API contracts join by `page.id: lead-detail` | pass | Focused test contract assertion |
| Attachment panel has Attach files, Preview, Download, empty copy | pass | `pages/lead-detail.yaml` binding assertion |
| Upload requires `crm.write` and CRM attachment kind | pass | Action declaration assertion |
| Download requires `crm.read` plus storage permission | pass | Action/storage declaration assertion |
| File name and size guards | pass | 422 mutation assertions |
| Missing lead guard | pass | 404 mutation assertion |
| Protected exact download bytes and MIME type | pass | `handleFileRoutes` assertion |
| Idempotent migration and deterministic inline fixture | pass | Double migration and fixture query |
| Upload audit and metadata persistence | pass | Activity-log and attachment-row queries |
| File-backed restart persistence | pass | Reopened DuckDB assertions |
| Authenticated Odoo/Core3 desktop/mobile visual comparison | blocked | BrowserSkill tab-borrow confirmation timeout |
