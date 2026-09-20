# Surveys public Scale question evidence

Feature: `SURVEYS-PUBLIC-SCALE-QUESTION-001`

This bounded slice implements the public Odoo Scale question behavior as a
deterministic 0–10 option range. The page contract remains in
`services/surveys/pages/surveys.yaml`; public progress/submit actions remain in
the separate `services/surveys/api/surveys.yaml` fragment with
`page.id: surveys`.

- `source-comparison.md` records the Odoo source basis and Core3 mapping.
- `qa-inventory.md` records the desktop/mobile claims and blockers.
- `test-results.md` records focused verification.
- `verification.md` records authenticated browser and Odoo comparison results.
- `core3-browser-results.json` and `odoo-browser-results.json` are raw probes;
  PNGs are the matching 1440x900 and 390x844 captures or exact startup-blocker
  captures.

This is conditional evidence only; no Surveys module sign-off is claimed.
