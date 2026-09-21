# Gap matrix

| Odoo behavior | Core3 status | Evidence / blocker |
| --- | --- | --- |
| Portal group-by choices | implemented | page/API YAML and focused test |
| Parent Task grouping | implemented | durable `parent_task_*` projection and test |
| Grouped total calculation | API-verified | test reconciles every group to row hours |
| Hide grouped table column | renderer-supported contract | Core3 browser capture blocked |
| Group ordering and 100-row pagination semantics | open visual comparison | shared ListView groups fetched rows locally; Core3 capture unavailable |
| Odoo authenticated desktop/mobile reference | captured | three PNGs in this directory |
| Core3 authenticated desktop/mobile | blocked | `PageSchemaError`: `components[0].views[5].category_field is required for graph`; `components[0].views[6].title_field is required for activity`; `components[0].views[6].activity_types must be a non-empty array for activity` |

No visual parity sign-off is claimed while the Core3 runtime is unavailable.
