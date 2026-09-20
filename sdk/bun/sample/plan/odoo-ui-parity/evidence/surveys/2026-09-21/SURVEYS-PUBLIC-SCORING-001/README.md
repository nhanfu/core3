# Surveys public response scoring — `SURVEYS-PUBLIC-SCORING-001`

Bounded implementation evidence for the next uncovered public participant
behavior: durable score percentage and Quiz Passed state after submit.

- Core3 implementation: `services/surveys/module.ts`, `operations.yaml`,
  `api/surveys.yaml`, `pages/surveys.yaml`, and migration `0.0.24`.
- Tests: `test/surveys_public_scoring.integration.test.ts` plus the adjacent
  public response/restart/retry/answer-validation/deadline set.
- Core3 authenticated browser evidence: `core3-browser-results.json` and
  `core3-authenticated-{desktop,mobile}.png`.
- Odoo comparison evidence: `odoo-browser-results.json` and
  `odoo-{desktop,mobile}.png`.

The implementation and bounded persistence/guard tests pass. This is not
module sign-off: the shared Core3 runtime did not register the public API for
the authenticated probe, and the Odoo instance redirected the public token to
login without an installed Survey result fixture.
