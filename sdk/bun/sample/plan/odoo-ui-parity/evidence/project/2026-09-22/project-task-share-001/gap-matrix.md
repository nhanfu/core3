# Gap matrix

| Odoo capability | Core3 result | Status |
| --- | --- | --- |
| Task Share Task action and form contract | Page/API/action YAML with source-backed fields | implemented |
| Durable recipient/share-link state | `project_task_shares` with fixed-date replay | implemented |
| Permission, company, privacy, duplicate, invalid, stale guards | `project.task.publish` and YAML mutation guards | implemented |
| Send portal email | Invitation intent is persisted; mail delivery is absent | partial |
| Portal user/signup/access-token side effects | Deterministic link only | missing |
| Follower/chatter notification side effects | Not implemented in this slice | missing |
| Authenticated desktop/mobile visual comparison | BrowserSkill borrow denied | blocked |
