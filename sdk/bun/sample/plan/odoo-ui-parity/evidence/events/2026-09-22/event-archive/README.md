# Events archive and restore evidence

Stable feature ID: `EVENTS-EVENT-ARCHIVE-001`.

This bounded slice implements the Odoo 19 `event.event.active` archive
boundary in Core3's YAML-first Events service. The list defaults to active
events, the Records filter exposes Archived, and Archive/Restore mutations
are available from both the event list and event detail form.

- Local source analysis: `source-comparison.md`
- Functionality checklist: `functionality-checklist.md`
- Test results: `test-results.md`
- Browser verification: `browser-check.md`
- Verification and residuals: `verification.md`
