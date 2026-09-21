# Source comparison

Odoo 19 source revision `65975996`:

- `addons/survey/models/survey_survey.py:120-121,189-190` defines the stored
  `is_time_limited` flag, minute-based `time_limit`, and positive-limit
  constraint.
- `addons/survey/models/survey_user_input.py:28,43,97-106,230-232` stores
  `start_datetime`, computes `survey_time_limit_reached` from the attempt start
  plus the survey limit, and sets the start timestamp when an attempt enters
  progress.
- `addons/survey/controllers/main.py:291-295,365,431,545-569` exposes
  `timer_start`/`time_limit_minutes` to the public form and rejects expired
  attempts before navigation/submission.
- `addons/survey/views/survey_templates.xml:158-162,181-187` shows the limit
  on the public start surface and binds the timer data to the rendered form.

Core3 implementation:

- `services/surveys/migrations/20261008000000-041-survey-public-time-limit.yaml`
  adds durable survey `is_time_limited`/`time_limit` and response
  `start_datetime`, and seeds a published one-minute survey fixture.
- `services/surveys/pages/surveys.yaml` and
  `services/surveys/api/surveys.yaml` remain separate and join through
  `page.id: surveys`. The API projects timer metadata and declares
  `surveys.public` start/begin/progress/navigation/submit contracts.
- `services/surveys/operations.yaml` returns timer metadata and response start
  state. `services/surveys/module.ts` applies the server-authoritative timer
  guard before public reads or mutations and returns
  `SURVEY_PUBLIC_TIME_LIMIT_EXPIRED` without changing answer data.
- `public/components/PublicSurvey.ts` renders the countdown from the durable
  response start timestamp, disables the current action after expiry, and stops
  the interval on navigation/completion.

The Core3 public `deadline` remains an independent response-level guard. The
existing `PublicLiveSession.ts` question timer is not modified by this slice.
