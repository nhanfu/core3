# Gap matrix

| Odoo source behavior | Core3 result | Evidence |
| --- | --- | --- |
| Project kanban manager `Duplicate` action | Implemented in Projects row action/API | Contract test |
| Project `(copy)` naming and active state | Implemented and durable | Mutation test |
| Milestone and active task-tree copy | Implemented with remapped parent IDs | Mutation/reopen test |
| Internal dependency remapping | Implemented | Dependency assertion |
| Odoo chatter/follower/embedded-action side effects | Not claimed | Separate parity gap |
| Full recurring-task/history semantics | Partial; recurrence rows are copied when present, full Odoo history is not | Separate parity gap |
| Authenticated desktop/mobile visual proof | Blocked by BrowserSkill borrow confirmation | Verification |
