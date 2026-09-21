# Permission results

| Surface | Permission | Result |
| --- | --- | --- |
| Waiting state and option datasources | `manufacturing.read` | Declared |
| Plan transition | `manufacturing.write` | Declared; reuses `mrp_workorders` |
| Create/delete | None | Not exposed, matching source action |
| Unauthorized/forbidden/transport | 401/403/503 | Explicit datasource envelopes |

Focused contract tests verify the read permission, write permission on Plan,
workflow identity, and absence of create/delete operations. Full actor/browser
authentication boundaries remain part of the module-wide open QA gate.
