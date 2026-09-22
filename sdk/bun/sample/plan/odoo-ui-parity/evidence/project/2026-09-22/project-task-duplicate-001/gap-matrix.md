# Gap matrix

| Source behavior | Core3 result | Evidence |
| --- | --- | --- |
| Task kanban `Duplicate` action | Implemented in task detail action menu and API | Focused contract test |
| Active task copy with `Task (copy)` name | Implemented and durable | Mutation test |
| Active child-task copy | Implemented recursively with remapped parent IDs | Mutation test, 2 seeded children |
| Dependency reset during copy | Implemented by omission, matching Odoo `copy_data` reset | Source comparison |
| Source row optimistic concurrency | Implemented with stale guard and atomic version increment | Guard test |
| Company and active/project scope | Implemented | Guard test |
| Odoo chatter/follower/attachment/portal side effects | Not claimed | Separate parity gaps |
| Odoo recurrence-rule copy | Not claimed in this bounded slice | Separate follow-up |
| Authenticated desktop/mobile browser proof | Blocked by borrow confirmation timeout | Verification |
