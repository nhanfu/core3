# EMP-DEPARTMENT-CHILDREN-001 evidence

This evidence set covers one bounded Employees feature: the department kanban
menu action `Child departments`.

Scope is limited to the Odoo source mapping, Core3 YAML page/API contracts,
durable department hierarchy, read permission boundary, recursive read
behavior, migration replay/restart, and regression/build results. It does not
claim completion of the Employees module.

No credentials, cookies, tokens, or authenticated page contents are stored in
this directory. Browser visual evidence is absent because the shared signed-in
tab was already borrowed by another BrowserSkill session.

Artifacts:

- `odoo-analysis.md` — local Odoo source and action mapping.
- `source-comparison.md` — bounded parity matrix.
- `functionality-checklist.md` — functional, permission, persistence, and UI
  checks.
- `gap-matrix.md` — implemented and blocked boundaries.
- `test-results.md` — command results and assertion counts.
- `verification.md` — exact BrowserSkill blocker and recapture requirements.
