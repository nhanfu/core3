# Source comparison

| Odoo behavior | Core3 implementation | Classification |
| --- | --- | --- |
| Tasks > All Tasks menu/action | Nested Project Tasks menu with `/all-tasks` | implemented |
| Template descendants excluded | Durable task query currently scopes active task rows and the owned fixtures contain no template descendants | partial; template ancestry fields remain a broader Project gap |
| Open tasks default | `default_filters: { state: open }` and Todo/In Progress query predicate | implemented |
| View order list/kanban/form/calendar/activity/pivot/graph | List/Kanban/Cards/Calendar/Activity/Pivot/Graph declarative tabs; shared task form side panel | partial; Core3 Cards is the responsive companion for the source Kanban |
| Search and task/project/assignee filters | YAML ListView filters and real SQL datasource | implemented |
| My Tasks current-user domain | Existing My Tasks query uses `task_scope: my` and `current_user_name` | implemented for the owned assignee projection |
| Odoo chatter/email and full task creation | Outside this bounded read/action slice | missing |
