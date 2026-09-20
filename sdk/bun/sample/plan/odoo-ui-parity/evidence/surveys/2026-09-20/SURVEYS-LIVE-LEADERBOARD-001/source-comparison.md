# SURVEYS-LIVE-LEADERBOARD-001 source comparison

Date: 2026-09-20

## Odoo source trace

- `/home/nhanjs/projects/odoo/addons/survey/controllers/survey_session_manage.py:144-160`
  defines the authenticated JSON-RPC `/survey/session/leaderboard/<survey_token>`
  host endpoint. It returns no leaderboard when the token is invalid or the
  session is not `in_progress`, otherwise it renders the current attendee
  leaderboard.
- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:967-1018`
  prepares up to 15 attendees ordered by score, with current-question score
  adjustment and position fields.
- `/home/nhanjs/projects/odoo/addons/survey/controllers/survey_session_manage.py:39-66`
  establishes the authenticated host session manager and its ready/in-progress
  lifecycle.

## Core3 implementation trace

- `services/surveys/api/live-session-results.yaml` adds the permissioned
  `survey_live_session_leaderboard` datasource, scoped to survey/session and
  current `In Progress` state, ordered deterministically by score and ID and
  capped at 15 rows.
- `services/surveys/pages/live-session-results.yaml` renders the shared Odoo
  ListView with position, attendee, score, and state columns.
- `services/surveys/pages/live-session.yaml` adds the `surveys.manage` host
  action `show_live_session_leaderboard`, navigating to the results page with
  the session context.
- Existing durable `survey_live_attendees` rows provide the persistent score
  projection; the test reopens DuckDB and replays migrations before reading the
  same ordered leaderboard.

## Paired runtime evidence and limitation

- Core3 authenticated Admin desktop 1440x1000 and mobile 390x844 started the
  seeded live session, opened Leaderboard, rendered Nora Parker (100) and Omar
  Vega (60), and reported no horizontal overflow.
- Reachable authenticated Odoo `core3_reference` at `127.0.0.1:8069` loaded
  the Feedback Form session manager at both viewports. The exact JSON-RPC
  leaderboard response was `{ "result": "" }`: the active reference session
  has no attendee attempts and `session_show_leaderboard=false`. This is the
  precise Odoo fixture blocker, not a Core3 failure or parity sign-off.
- The disposable demo proxy on port 8072 was not required for this probe; the
  reachable reference and exact empty JSON-RPC response are recorded here.

Screenshots and JSON probes are in this directory.
