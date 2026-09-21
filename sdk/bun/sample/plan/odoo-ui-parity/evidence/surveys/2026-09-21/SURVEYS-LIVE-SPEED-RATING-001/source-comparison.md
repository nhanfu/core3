# SURVEYS-LIVE-SPEED-RATING-001 source comparison

## Odoo source

- `survey.survey.session_speed_rating` and
  `session_speed_rating_time_limit` are rendered in the Live Session form at
  `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:182-187`.
- Odoo requires a positive default window when speed rating is enabled at
  `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:201-203`.
- Correct timed session answers receive speed-adjusted scores in
  `/home/nhanjs/projects/odoo/addons/survey/models/survey_user_input.py:766-808`:
  answers under two seconds receive full credit, then the remaining score
  scales linearly down to the 50% floor over the configured question window.
- The inspected Survey model, view, and security sources contain no
  `company_id`; company scoping is therefore not applicable to this feature.

## Core3 implementation

- `20261025000000-062-survey-live-speed-rating.yaml` adds durable configuration.
- `20261025010000-063-survey-live-speed-rating-demo.yaml` seeds Burger Quiz
  quick-answer rewards with a 90-second default and a timed rating question.
- `api/survey-detail.yaml` and `pages/survey-detail.yaml` expose the
  authenticated `update_survey_speed_rating` action joined by
  `page.id: survey-detail`.
- `api/live-session-join.yaml` and `pages/live-session-join.yaml` expose the
  speed metadata through their existing `page.id: survey-live-session-join`
  pair. The answer mutation calculates deterministic elapsed-time scoring and
  retains token, attendee, active-session, question-time, and replay guards.
- `services/surveys/module.ts` passes an optional deterministic `submitted_at`
  value for controlled answer replay; normal browser calls use the contract's
  fixed default timestamp.

## Scope result

The bounded slice covers configuration and answer scoring only. It does not
claim authenticated visual or paired Odoo parity because the required runtime
and reference services were unavailable during this run.
