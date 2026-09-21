# SURVEYS-PUBLIC-LIVE-POLL-001 source comparison

## Odoo source

- `addons/survey/controllers/survey_session_manage.py:68-119` advances the
  host question and publishes a `next_question` bus event scoped by the
  survey access token; attendees use that event to replace the current
  question without a manual page transition.
- `addons/survey/controllers/survey_session_manage.py:173-193` keeps the
  short session-code entry public while `_fetch_from_session_code` rejects
  invalid, certification, and non-launched sessions.

## Core3 slice

- `services/surveys/operations.yaml` adds `survey.public.session.poll`, which
  returns the current question and durable `survey_live_sessions.row_version`
  as `poll_revision`.
- `services/surveys/api/live-session-join.yaml` and
  `pages/live-session-join.yaml` remain the paired `page.id:
  survey-live-session-join` contract. The route requires `surveys.public`
  semantics and an attendee token before polling; foreign tokens return 404.
- `services/surveys/module.ts` serves
  `GET /api/public/surveys/session/<session_code>/poll` and scopes the session,
  current question, attendee, and current-question answer to that token.
- `public/components/PublicLiveSession.ts` polls every three seconds while an
  attendee is waiting for the host or has already submitted the current
  answer. It deliberately does not replace an unanswered form while the
  respondent may be typing.
