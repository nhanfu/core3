# Gap matrix

| Gap ID | Stable requirement | Change | Guard/assertion | Evidence |
| --- | --- | --- | --- | --- |
| BURNDOWN-GAP-001 | Missing record-linked action | Add `open_project_burndown` navigation action to project collection, grouped collection, and detail action menu | `project.read`; route discovery and action references tested | `test-results.md` |
| BURNDOWN-GAP-002 | Missing graph page/API separation | Add `pages/project-burndown.yaml` and `api/project-burndown.yaml` joined by `page.id: project-burndown` | discovery maps two datasources to page id | `test-results.md` |
| BURNDOWN-GAP-003 | Missing durable report data | Query persisted `projects` and `project_tasks` rows; no browser fixture or moving clock | fixed project scope, active/template guards, deterministic period labels | `test-results.md` |
| BURNDOWN-GAP-004 | Missing failure states | Declare forbidden and transport errors plus empty/not-found query branches | stable 403/503 metadata and empty results asserted | `functionality-checklist.md` |
| BURNDOWN-GAP-005 | Odoo stage-history parity | Core3 lacks task stage history | explicitly retained as partial follow-up; no false parity claim | `source-comparison.md` |
