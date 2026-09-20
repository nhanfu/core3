# Blockers

1. Core3 startup is blocked by the shared page-schema error:
   `components[0].search.categories is not allowed` and
   `components[0].search.or locations... is not allowed`. The offending page
   is outside the Surveys-owned paths and was not edited.
2. Odoo 8069 redirects the public certification token to its login page at
   both viewports, so no authenticated installed Survey Scale fixture is
   available. No paired Odoo mutation or visual sign-off is claimed.
3. The existing DuckDB migration rollback/dependent-entry blocker remains
   open; the full migration suite was not rerun for this bounded slice.
