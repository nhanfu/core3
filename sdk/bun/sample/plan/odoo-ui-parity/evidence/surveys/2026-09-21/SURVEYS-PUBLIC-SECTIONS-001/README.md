# SURVEYS-PUBLIC-SECTIONS-001

This bounded slice closes the public survey section boundary. Odoo stores
section/page rows alongside questions but does not present them as answerable
questions. Core3 now excludes `is_page` rows from the public question catalog,
first-question lookup, current-question lookup, and durable next/previous
cursor resolution.

- Source comparison: `source-comparison.md`.
- Core3 desktop/mobile probe: `core3-desktop.png`, `core3-mobile.png` and
  `browser-results.json`.
- Odoo desktop/mobile probe: `odoo-desktop.png`, `odoo-mobile.png` and
  `browser-results.json`.
- Exact runtime/reference blockers: `runtime-blocker.json`.
- Durable contract/concurrency/restart proof:
  `test/surveys_public_sections.integration.test.ts`.

The implementation and integration tests pass, but the captured browser states
are blocker evidence rather than sign-off because the shared runtime did not
register the public route and the conditional Odoo token was not available.
