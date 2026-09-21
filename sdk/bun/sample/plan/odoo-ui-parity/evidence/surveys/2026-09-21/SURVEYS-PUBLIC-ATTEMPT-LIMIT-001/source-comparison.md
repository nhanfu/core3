# Surveys public attempt limit — source comparison

Feature: `SURVEYS-PUBLIC-ATTEMPT-LIMIT-001`

Odoo source comparison:

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:92-99`
  defines access mode and login-required behavior; lines 117-119 define the
  durable limited-attempt flag and positive attempt limit.
- `survey_survey.py:535-619` checks attempt availability when creating an
  answer; `survey_survey.py:667-693` counts completed, non-test answers by
  partner/email/invite identity. Public anonymous surveys do not consume a
  per-user limit unless login is required.
- `/home/nhanjs/projects/odoo/addons/survey/controllers/main.py:541-543`
  repeats the attempt guard at submit to prevent multiple open attempts from
  bypassing the limit.

Core3 implementation:

- Migration `0.0.42` adds durable `access_mode`, `users_login_required`,
  `is_attempts_limited`, and `attempts_limit`, with a deterministic published
  login-required one-attempt fixture.
- `operations.yaml` and `api/surveys.yaml` keep attempt metadata/counting in
  the API contract; start requires respondent email for an active limited
  survey, and start/retry/submit enforce completed non-test counts.
- `PublicSurvey.ts` renders the email identity control and sends the normalized
  identity on public start. The API remains authoritative for actor, token,
  state, and attempt guards.
- Existing unrestricted public surveys retain anonymous start behavior.

No Odoo parity sign-off is claimed because the local reference route was not
authenticated or available as an installed Surveys fixture.
