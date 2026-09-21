# Gap matrix

| Gap | Required change | Evidence |
| --- | --- | --- |
| No Overview Late action | Add declarative navigation action with selected-center/default-filter params | focused integration test |
| No Late-specific page/API binding | Add presentation-only page and page-id-bound API | discovery test |
| Late query not isolated as a bounded route | Query durable `mrp_workorders`, apply optional Late default, selected-center scope, and terminal exclusion | datasource assertions |
| Late query lacks dedicated index | Add idempotent `(workcenter, late, state, planned_date, sequence)` index | migration/restart assertions |
| Odoo visual source unavailable | Retain exact desktop/mobile Discuss blocker captures | verification.md |
