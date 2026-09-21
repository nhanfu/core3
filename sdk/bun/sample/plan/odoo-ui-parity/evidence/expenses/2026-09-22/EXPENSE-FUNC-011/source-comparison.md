# Source comparison

| Odoo source behavior | Existing Core3 before batch | Batch 8 implementation |
| --- | --- | --- |
| `mail.activity.mixin` on `hr.expense` | Workflow/email history only | Scheduled activity table and chatter source |
| `activity_ids` list widget | No activity action contract | `activity_action: schedule_expense_activity` |
| Activity view in My Expenses | No activity completion control | Shared Odoo chatter `activity_complete_action` |
| Planned activity deadline/type/assignee | Not persisted | `expense_scheduled_activities` fields and deterministic defaults |
| Mark done lifecycle | Missing | Guarded Done transition and completion audit |

Changed implementation paths are limited to `services/expenses/`,
`test/expenses_activities.integration.test.ts`, the Expenses migration replay
assertion, and Expenses plan/QA/evidence paths.
