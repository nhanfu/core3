# Blockers

1. **DuckDB migration rollback:** all four existing migration rollback tests
   fail with `Dependency Error: Cannot alter entry "surveys" because there are
   entries that depend on it.` This prevents a clean full Surveys regression;
   the new forward migration and conditional lifecycle test pass.
2. **Shared audit boundary:** `bun run audit` stops on a non-Surveys page
   definition requiring `views[1].group_by` and rejecting `search.names` and
   `search.templates...`. No unrelated owner file was changed.
3. **Core3 browser runtime:** a fresh `bun dev --db=ddb --memory` process
   announced ports 4340/4341 but never served `/api/modules`; the bounded
   frontend probe therefore returned HTTP 502 and logged proxy refusal to the
   default backend at 127.0.0.1:3001. A direct embedded server attempt was
   separately blocked by an existing `coredb/auth.duckdb.wal` DuckDB internal
   error during WAL replay. Both runtime processes were stopped.
4. **Odoo reference:** `GET /survey/branching-public-token-2026` redirected
   `/ → /odoo → /web/login?redirect=%2Fodoo%3F`; the host had no authenticated
   installed Survey fixture for this feature. Desktop/mobile captures are
   retained, but no paired Odoo mutation or visual sign-off is claimed.

These blockers are recorded precisely; the feature remains conditional and
the module is not signed off.
