# Blockers

1. **DuckDB rollback gate:** all four migration rollback tests fail with
   `Dependency Error: Cannot alter entry "survey_questions" because there are
   entries that depend on it.` The new forward migration and focused restart
   path pass, but the historical rollback gate is not clean.
2. **Core3 runtime:** a fresh `bun dev --db=ddb --memory` process announced
   ports 4350/4351 but did not serve `/api/modules` within the bounded window.
   The frontend screenshots therefore show HTTP 502 and Vite logged refusal
   to the default backend at 127.0.0.1:3001. The child backend process was
   stopped after the probe.
3. **Odoo reference:** the public token redirected `/ → /odoo →
   /web/login?redirect=%2Fodoo%3F` at both viewports. The reference host did
   not provide an authenticated installed Survey comments fixture, so no
   paired Odoo mutation or visual sign-off is claimed.

The feature is conditionally verified at the service level; Surveys remains
**qa-in-progress / conditional**.
