# QA inventory — SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001

## Scope

- Feature: durable public conditional-question visibility and navigation.
- Core3 page: `/survey/start/branching-public-token-2026` and the paired
  token-scoped `/api/public/surveys/...` actions.
- Viewports: desktop `1440x900`; mobile `390x844`.
- Actors: authenticated Core3 Administrator where the host permits login,
  anonymous public token, and the Odoo reference route where installed.

## Required probes

1. Core3 authenticated desktop and mobile landing/rendered route.
2. Core3 public API catalog plus conditional next-question response.
3. Odoo authenticated desktop and mobile conditional-survey comparison.
4. No horizontal overflow, failed-request, or token-disclosure regressions.

## Evidence files

- `browser-results.json`
- `core3-desktop.png`, `core3-mobile.png`
- `odoo-desktop.png`, `odoo-mobile.png`
- `source-comparison.md`, `test-results.md`, `verification.md`,
  `blockers.md`

The browser files are runtime observations only; focused persistence and
permission assertions remain in the integration test.
