# Authenticated Integration Audit

Run against a fresh DuckDB instance with the seeded admin account on 2026-07-26.

The repeatable command is:

```sh
TMS_BASE_URL=http://localhost:3339 bun run audit
```

For browser route smoke coverage, with the local headless CDP page running:

```sh
TMS_BASE_URL=http://localhost:3339 TMS_CDP_URL=http://localhost:9222 bun run audit:ui
```

## Results

- 68 YAML page definitions loaded through `GET /api/pages/:id` with the admin permission set.
- 122 YAML datasource definitions executed through `POST /api/query`.
- 0 page-definition failures.
- 0 datasource SQL/runtime failures.
- 51 registered SPA routes mounted in a real browser with 0 route or console-error failures; shared column chooser, status-tab, search, and safe editor-open/dismiss controls were exercised when present.

The command discovers all 68 YAML files, fetches each page through the public
page endpoint, derives null bind parameters from each server-owned query, and
fails nonzero on any page or datasource response error.

The audit supplied null defaults for common filter parameters (`q`, `status`,
date range fields, and lookup filters) and used `user-admin` as the authenticated
subject. Domain mutations remain covered by the route-specific checklists and
runtime interaction tests; this audit verifies the shared page/datasource gate.
