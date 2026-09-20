# Blockers

1. **Core3 runtime:** `PORT=4340 FRONTEND_PORT=4341 bun dev --db=ddb
   --memory` reported frontend readiness, but backend port 4340 refused
   connections during the bounded readiness window. Both Core3 probes record
   `net::ERR_CONNECTION_REFUSED` at 1440x900 and 390x844.
2. **Odoo reference:** the public route returned HTTP 200 only after
   redirecting to the Odoo login form at
   `/web/login?redirect=%2Fodoo%3F` for both viewports. No authenticated public
   Matrix response could be compared.
3. **Migration rollback:** the existing Surveys DuckDB rollback test remains
   blocked by `Dependency Error: Cannot alter entry "surveys" because there
   are entries that depend on it.` The migration was forward-applied by the
   focused public tests, but the rollback suite remains red and is not claimed
   as fixed by this slice.
