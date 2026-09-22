# Source comparison

| Odoo behavior | Current Core3 before slice | Bounded result | Classification |
| --- | --- | --- | --- |
| Project card Reporting > Burndown Chart action | No Project burndown action or route | Added action on Projects, grouped Projects, and Project detail action menu | implemented |
| Graph-only Burndown Chart | No report page | Added `project-burndown` Chart page with line series | implemented |
| Service-backed task report scoped to active project | Project task table exists, but no report query | Added `project_burndown_chart` query scoped by `project_id` | implemented |
| Weekly date grouping and open/closed lines | No report series | Added fixed `2026-01-15` through `2026-02-26` weekly series | implemented |
| Odoo historical stage-move reconstruction and dynamic stage lines | No stage-history/event table | Uses durable current task state and due dates for bounded open/closed series | partial; follow-up requires task stage history |
| Odoo search facets and configurable graph grouping | No shared report filter contract in this slice | Not claimed; chart remains a read-only bounded action | partial |
| Odoo authenticated desktop/mobile comparison | Not available in this run | BrowserSkill blocker recorded in `verification.md` | blocked |
