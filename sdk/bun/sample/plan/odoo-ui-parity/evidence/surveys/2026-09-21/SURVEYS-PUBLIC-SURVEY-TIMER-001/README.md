# SURVEYS-PUBLIC-SURVEY-TIMER-001

Wave 20 bounded slice: Odoo-style survey-level elapsed time limit for a public
attempt. This is distinct from the existing response `deadline` and the live
session per-question timer.

Status: Core3 implementation and persistence checks pass; visual/reference
comparison remains conditional. No Surveys module sign-off is claimed.

Evidence files:

- `source-comparison.md` — Odoo source and Core3 contract comparison.
- `test-results.md` — focused lifecycle/restart results.
- `core3-browser-results.json` — fresh desktop/mobile runtime probes and exact
  unavailable-host blocker.
- `odoo-blocker.json` — authenticated-route redirect and installed-reference
  limitation.
- `odoo-desktop.png`, `odoo-mobile.png` — truthful login-shell captures, not
  Surveys screens.
