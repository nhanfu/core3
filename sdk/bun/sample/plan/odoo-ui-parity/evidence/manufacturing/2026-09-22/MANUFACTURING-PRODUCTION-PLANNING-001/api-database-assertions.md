# API/database assertions

- Default flags return `wo-blocked-001`, `wo-progress-001`, and
  `wo-progress-002` from active `mo-progress-001`.
- Clearing defaults returns five work orders from active productions,
  including the Finished work order on `mo-to-close-001`.
- Done and Cancelled production orders are excluded even when their
  work-order state is otherwise eligible.
- Work-center and free-text filters are server-side SQL predicates.
- `fixture_state=empty` returns an empty result; `fixture_state=transport_error`
  returns 503 `MRP_PRODUCTION_PLANNING_UNAVAILABLE`.
- Migration `0.0.24` can be replayed and creates
  `idx_mrp_workorders_production_schedule` idempotently.
- File-backed close/reopen preserves the production-scoped rows.
