# Gap matrix

| Area | Odoo reference | Core3 status | Evidence |
| --- | --- | --- | --- |
| Data model | `parent_id` / `child_ids` | `parent_task_id` implemented | migration and test |
| API/actions | relation CRUD and open form | permission/state/version guarded | `task-detail.yaml` and test |
| Odoo desktop/mobile | Sub-tasks list and inline row | captured 1440x833 and 390x844 | PNGs |
| Core3 list | seeded child rows visible | captured at both sizes | PNGs |
| Core3 task form | existing Timesheets prefetch | not executable in Project-only topology | `verification.md` |
