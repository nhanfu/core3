# Surveys public response restart comparison

Feature: `SURVEYS-PUBLIC-RESPONSE-RESTART-001`

## Odoo source behavior

The Odoo controller at `/home/nhanjs/projects/odoo/addons/survey/controllers/main.py`
defines the public respondent lifecycle as follows:

- `survey_retry` (`main.py:167-191`) validates the survey and answer tokens,
  then creates a new answer for a permitted retry.
- `survey_start` (`main.py:209-225`) is `auth='public'`, accepts a survey token
  and optional answer token/cookie, and resolves the current answer before
  entering the survey.
- `survey_begin` (`main.py:490-505`) and `survey_next_question`
  (`main.py:507-519`) validate both tokens and mark a new answer in progress.
- `survey_submit` (`main.py:521-535`) validates access before storing answers;
  completed answers are rejected rather than submitted again.
- `survey_print` (`main.py:662-674`) is public, validates the survey/answer
  token, and renders a submitted answer in printable form.

## Core3 implementation

Core3 keeps the rendered page contract in
`services/surveys/pages/surveys.yaml` and the backend actions in
`services/surveys/api/surveys.yaml`. The page fragment no longer owns the
public mutations; the API fragment has one `page: { id: surveys }` contract
and declares `public_survey_start`, `public_survey_progress`, and
`public_survey_submit` with `permission: surveys.public`.

`services/surveys/module.ts:40-172` authenticates the published survey token,
checks the answer token against the same survey, rejects stale/completed
responses, validates required answers, and maps the public actions to the
YAML service. Submit is guarded by `state = 'In Progress'`, increments the
survey response count once, and uses the deterministic fixture timestamp
`2026-01-15 09:30:00`. `operations.yaml:2-22` supplies the token-scoped
survey, question, response, and print queries.

`test/surveys_public_response_restart.integration.test.ts` proves that a
public response can be started and progressed, the DuckDB file can be closed
and reopened, and the same answer token can submit exactly once after restart.
It also checks the public permission declarations, unauthenticated read,
wrong-survey rejection, submitted timestamp, response count, and idempotent
replay row count.

## Live paired probe

On 2026-09-20, `codex@core3.local` authenticated to the local Odoo reference
at `http://127.0.0.1:8069`. The published token
`b135640d-14d4-4748-9ef6-344ca256531e` resolved successfully to the Feedback
Form, but Odoo rendered:

> The session will begin automatically when the host starts.

No question controls or submit action were available, so a host-started Odoo
response cannot be created for this paired run. The desktop and mobile captures
`odoo-authenticated-desktop-before.png` and
`odoo-authenticated-mobile-before.png` preserve the exact blocker. This is a
reference fixture/session limitation; it is not an Odoo parity sign-off.
