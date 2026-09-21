# Gap matrix

| Gap | Change | Evidence |
| --- | --- | --- |
| No durable vehicle/tag relation | Migrations `20260922130000-042` and `20260922131000-043` add idempotent schema and fixtures | Restart test |
| No vehicle detail tag datasource | API YAML adds scoped options and assignments, joined by `page.id: vehicle-detail` | Static contract test |
| No assignment workflow | Add/remove line-item actions update the parent row version atomically | CRUD/guard tests |
| No responsive detail UI | `LineItemGrid` is mounted into the existing Odoo form content slot | UI audit; browser capture unavailable |
| No live visual proof | Requested Odoo database has no Fleet app; Core3 runtime/auth capture was not available in this turn | Blocker evidence |
