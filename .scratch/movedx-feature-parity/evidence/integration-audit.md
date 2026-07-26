# Authenticated Integration Audit

Run against a fresh DuckDB instance with the seeded admin account on 2026-07-26.

## Results

- 68 YAML page definitions loaded through `GET /api/pages/:id` with the admin permission set.
- 120 unique YAML datasources executed through `POST /api/query`.
- 0 page-definition failures.
- 0 datasource SQL/runtime failures.

The audit supplied null defaults for common filter parameters (`q`, `status`,
date range fields, and lookup filters) and used `user-admin` as the authenticated
subject. Domain mutations remain covered by the route-specific checklists and
runtime interaction tests; this audit verifies the shared page/datasource gate.
