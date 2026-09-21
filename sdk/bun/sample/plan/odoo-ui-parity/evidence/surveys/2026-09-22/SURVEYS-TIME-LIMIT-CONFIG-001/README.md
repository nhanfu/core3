# SURVEYS-TIME-LIMIT-CONFIG-001

Bounded authenticated Survey Options slice: configure the survey-level time
limit after the completed scoring-settings slice. The Core3 implementation is
YAML-first and keeps `pages/survey-detail.yaml` separate from
`api/survey-detail.yaml`, joined by `page.id: survey-detail`.

Artifacts:

- `odoo-analysis.md`: Odoo 19 source and live reference trace.
- `functionality-checklist.md`: bounded acceptance cases.
- `source-comparison.md` and `gap-matrix.md`: source-backed gap and mapping.
- `test-results.md`: focused tests, audit, build, lint, and blockers.
- `verification.md`: authenticated browser verification and exact runtime
  limitation.
- `browser-results.json`: browser/session/request evidence summary.
- `odoo-desktop-1440x900.png`: Odoo desktop Options reference capture.
- `odoo-mobile-390x844.png`: Odoo mobile-emulation Options reference capture.

No Core3 screenshot is claimed: the isolated module runtime failed before
readiness with the shared page-discovery error recorded in `verification.md`.

