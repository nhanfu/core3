# Project Configuration > Projects — evidence

Feature: `PROJECT-CONFIGURATION-001`.

This bounded slice implements Odoo's manager-only Configuration > Projects
action (`open_view_project_all_config`) at `/project-configuration`. Core3
uses separate layout/API YAML joined by `page.id`, the durable `projects`
table, and an idempotent sequence migration. CRUD, archive/restore, delete
dependency guards, search/filter/empty/error states, and stale row protection
are covered by the focused and Project regression suites.

Live Odoo inspection was blocked. On BrowserSkill instance `245ea108`, the
first borrow of authenticated Odoo tab `1770662590` was refused because
session `expk` already owned it. A later fresh borrow waited 30 seconds without
confirmation and timed out. No screenshots were produced, and no visual,
responsive, authenticated, or paired-Odoo parity claim is made.
