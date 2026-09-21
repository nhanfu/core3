# API and database assertions

- Page YAML has no `datasources` or `actions` keys.
- API YAML declares `page.id: manufacturing-work-center-workorders`.
- API datasources are `mrp_workcenter_workorder_states` and
  `mrp_workcenter_workorders`; the page source binds to the latter.
- Scoped query resolves `workcenter_id` through persisted `mrp_workcenters` and
  additionally checks the supplied name, then excludes Finished/Cancelled
  rows.
- Migration `0.0.21` is idempotent and creates only
  `idx_mrp_workorders_workcenter_state_plan`; it does not insert fixture rows.
- Full Manufacturing migration chain replayed twice in the focused test. The
  persisted Assembly 1 and Assembly 2 rows were returned in scope, while
  terminal rows and empty fixtures returned no rows.
