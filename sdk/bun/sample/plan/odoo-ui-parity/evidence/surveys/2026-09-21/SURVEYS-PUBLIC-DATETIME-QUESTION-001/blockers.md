# Blockers

1. The shared Core3 runtime's route registry does not expose the authenticated
   public Surveys route: direct public API probe is HTTP 404 `API route not
   found`, while the rendered public route is HTTP 200 `Unauthorized`.
2. Odoo 8069 redirects the public certification token to its login page at
   both viewports, so no authenticated installed Survey Datetime fixture is
   available. No paired Odoo mutation or visual sign-off is claimed.
3. The adjacent full migration rollback test remains blocked by the existing
   DuckDB dependent-entry error: `Cannot alter entry "surveys" because there
   are entries that depend on it.`
