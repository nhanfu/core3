# Project Burndown Chart — evidence

Feature: `PROJECT-BURNDOWN-001`.

This bounded slice implements the Odoo Project card Reporting > Burndown Chart
record action. Core3 adds the `/projects/detail/burndown` route, links its
presentation page to service-owned API fragments by `page.id`, and derives a
deterministic seven-week open/closed task series from persisted Project tasks.

Artifacts:

- `odoo-analysis.md` records the local Odoo action, graph, search, and model
  contract.
- `source-comparison.md` and `gap-matrix.md` record the current Core3 gap and
  bounded implementation decisions.
- `functionality-checklist.md` records the executed contract cases.
- `test-results.md` records focused test and audit results.
- `verification.md` records the BrowserSkill blocker and omitted captures.

No screenshots are included: BrowserSkill instance `245ea108` reported that
the authenticated Odoo tab `1770662590` was already borrowed by session `rjvi`.
The session was not stopped or bypassed, and no visual-parity claim is made.
