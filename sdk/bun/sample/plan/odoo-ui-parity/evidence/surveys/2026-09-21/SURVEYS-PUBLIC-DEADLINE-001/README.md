# SURVEYS-PUBLIC-DEADLINE-001

Bounded public response deadline lifecycle.

- Odoo source: `addons/survey/controllers/main.py`, `_check_validity`,
  `answer_deadline`.
- Deterministic expired fixture: `expired-deadline-fixture-token-2026`.
- Core3: migration `0.0.23`, `api/surveys.yaml` guards,
  `operations.yaml` deadline projection, and the Surveys-owned public
  renderer error binding.
- Focused test: `test/surveys_public_deadline.integration.test.ts`.
- Browser status: blocked before page readiness by the exact discovery error
  recorded in `verification.md`; no screenshot is claimed.
- Odoo status: no paired deadline sign-off.
