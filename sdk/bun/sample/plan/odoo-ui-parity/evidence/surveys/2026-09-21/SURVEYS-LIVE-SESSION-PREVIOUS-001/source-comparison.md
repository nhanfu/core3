# Source comparison

## Odoo

`addons/survey/controllers/survey_session_manage.py` defines the authenticated
JSON-RPC route `/survey/session/next_question/<survey_token>`. It resolves the
current session from the survey token, calls the ordered session-question
resolver with `go_back`, writes the selected question and start time with
`sudo`, and returns refreshed rendered question content plus its background.

## Core3

`services/surveys/api/live-session.yaml` exposes
`previous_live_session_question` with `surveys.manage`, state/row-version/
previous-question guards, and one atomic durable update. The result refreshes
`survey_live_session` and `survey_live_session_questions`. The matching page
header action is in `services/surveys/pages/live-session.yaml`; the pair joins
through `page.id: survey-live-session`.

## Comparison blockers

- Fresh Core3 authenticated desktop/mobile probes reached the frontend, but
  `/api/pages/survey-live-session` returned HTTP 404
  `{"error":"Unknown page: survey-live-session"}`. The current shared backend
  registry exposed only Blog pages, so the host action could not be rendered.
- Odoo `/s/5822` returned HTTP 200 at both requested viewports, but
  `/survey/check_session_code/5822` returned JSON-RPC
  `{"error":"survey_wrong"}`. No active reference live-session fixture is
  available for a paired host-navigation probe.

These are evidence blockers, not claims of parity sign-off.
