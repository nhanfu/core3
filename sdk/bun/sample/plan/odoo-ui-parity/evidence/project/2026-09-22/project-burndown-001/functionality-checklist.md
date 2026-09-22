# Functionality checklist

| Case | Class | Expected | Result |
| --- | --- | --- | --- |
| PROJECT-BURNDOWN-001 | functional | Project card/detail action navigates to the dedicated Burndown route | pass: action declarations and route discovery |
| PROJECT-BURNDOWN-002 | data | Project context returns persisted name, planned hours, and task count | pass: `project-demo-001` query |
| PROJECT-BURNDOWN-003 | data | Chart returns seven deterministic weekly rows with open/closed series | pass: rows `2026-01-15` through `2026-02-26` |
| PROJECT-BURNDOWN-004 | permission | Read permission is declared for page and datasources; forbidden state is stable | pass: `PROJECT_BURNDOWN_FORBIDDEN` |
| PROJECT-BURNDOWN-005 | error/empty | Empty, not-found, and transport-error branches remain deterministic | pass: empty arrays/singleton and `PROJECT_BURNDOWN_UNAVAILABLE` |
| PROJECT-BURNDOWN-006 | responsive/visual | Authenticated 1440x900 and 390x844 Odoo/Core3 comparison | blocked: borrowed Odoo tab owned by session `rjvi`; no captures or visual claim |
