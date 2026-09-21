# API and database assertions

- Page YAML is presentation-only; API YAML has matching page ID
  `manufacturing-bom-operations-performance`.
- The BoM detail API owns the stat action and computes the persisted completed
  report count from `mrp_workorder_analysis`.
- Report/filter datasources require `manufacturing.read` and declare 401, 403,
  and 503 error states.
- Migration `0.0.22` is replay-safe, maps existing deterministic rows to BoMs,
  and creates `idx_mrp_workorder_analysis_bom_done` with `IF NOT EXISTS`.
- Focused tests query `bom-drawer-primary` and `bom-table-odoo`, verify empty
  and transport states, replay the migration twice, and query the same result
  after closing and reopening a file-backed DuckDB database.
