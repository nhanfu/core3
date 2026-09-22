# Source comparison

| Odoo behavior | Core3 implementation | Classification |
| --- | --- | --- |
| Configuration > Projects menu/action | `/project-configuration`, manager-only manifest entry | implemented |
| Template projects excluded | `COALESCE(is_template, FALSE) = FALSE` query guard | implemented |
| Sequence-ordered configuration list | Durable `projects.sequence` column and ordered datasource | implemented |
| List/Kanban/Form action | Declarative ListView tabs and page-matched detail form | implemented |
| Search/status/stage/archived filters | Service-owned SQL query and deterministic options sources | implemented |
| New/Edit project | Permissioned YAML mutations with required-name, hours, and duplicate guards | implemented |
| Archive/restore | Row-version guarded mutations | implemented |
| Delete | Row-version guarded delete; tasks/milestones return explicit 409 | implemented with safe bounded scope |
| View Tasks, chatter, followers, attachments, full Odoo project fields | Existing Project detail/dependency slices or broader parity work | outside this bounded action |
