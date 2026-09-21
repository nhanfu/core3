# API and database assertions

- `mrp_workcenter_waiting_states` returns the single `Waiting` option.
- `mrp_workcenter_waiting_workorders` requires `manufacturing.read`, declares
  401/403/503 states, and joins durable `mrp_workorders` to
  `mrp_productions`.
- The query always applies `w.state = 'Waiting'`; optional `state` and `late`
  filters cannot broaden the result.
- `workcenter_id` resolves to the durable work-center name and is combined with
  the explicit name parameter for route scoping.
- `wo-confirmed-001` is returned for Assembly 2; terminal records and
  non-waiting records are excluded.
- Migration chain replay is idempotent and file-backed close/reopen returns the
  same waiting row, proving persistence without fixture-only report rows.
