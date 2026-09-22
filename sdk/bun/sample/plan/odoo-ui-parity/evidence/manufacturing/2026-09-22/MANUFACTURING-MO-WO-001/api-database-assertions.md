# API and database assertions

- Page contract has no datasources; API contract owns both datasources and is
  joined by `page.id: manufacturing-production-workorders`.
- Query requires `p.id = :id`, orders by durable work-order sequence, and
  returns no rows for explicit empty/not-found fixtures.
- The source declares 401, 403, 404, and 503 error envelopes.
- The action reuses `mrp_workorders` and exposes only Plan, Start, Pause,
  Continue, Block, and Cancel server actions.
- Migration `0.0.25` creates
  `idx_mrp_workorders_production_sequence` with `IF NOT EXISTS`; focused tests
  replay the full chain and reopen a file-backed DuckDB database.
