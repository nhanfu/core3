# Source comparison

## Odoo source

- `addons/survey/models/survey_question.py` stores `is_time_limited` and
  `time_limit`; the source limits this behavior to live sessions.
- `addons/survey/models/survey_user_input.py` computes the current question
  deadline from `session_question_start_time + time_limit` and exposes the
  `question_time_limit_reached` boundary.
- `addons/survey/controllers/survey_session_manage.py` sets the question start
  timestamp when the host advances the session.
- `addons/survey/views/survey_templates_user_input_session.xml` exposes timer
  data to the attendee form and renders the timer container.
- `addons/survey/views/survey_templates.xml` displays “Sorry, you have not
  been fast enough.” and disables the question form after expiry.

## Core3 implementation

- Migration `20261007000000-040-survey-live-question-timer.yaml` adds the
  durable question fields and seeds an isolated published timer survey,
  question, and closed live session (`5177`).
- `services/surveys/operations.yaml` and
  `services/surveys/api/live-session-join.yaml` return the durable timestamp
  and limit through the API contract.
- The paired API action retains `surveys.public`, attendee-token, session
  state, required-answer, and option guards; the new
  `SURVEY_SESSION_QUESTION_TIME_EXPIRED` guard runs before the mutation.
- `pages/live-session-join.yaml` documents the page/API timer binding and
  `public/components/PublicLiveSession.ts` renders the countdown and disables
  submission at expiry. The server remains authoritative.
