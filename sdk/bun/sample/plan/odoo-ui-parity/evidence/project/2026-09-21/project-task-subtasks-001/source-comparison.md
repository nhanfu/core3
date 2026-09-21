# Source comparison

| Odoo behavior | Core3 bounded implementation | Result |
| --- | --- | --- |
| `parent_id`/`child_ids` relation | `parent_task_id` migration and indexed child query | covered |
| Task form Sub-tasks notebook | Project `LineItemGrid` | covered |
| Add/edit/open/delete | Project YAML actions with matching datasource | covered |
| Child state and parent summary | state guard plus derived summary | covered |
| Company and active-record scope | read and mutation guards | covered |
| Restart/replay durability | idempotent migration and file-backed reopen test | covered |
| Odoo desktop/mobile | authenticated captures | captured |
| Core3 task-detail browser CRUD | blocked by missing `yaml.service.timesheets` | open blocker |
