# Source comparison

## Odoo 19

`addons/survey/views/survey_survey_views.xml:323-327` declares the kanban
button with label `End Live Session`, object method `action_end_session`, and
visibility only when `session_state` is `ready` or `in_progress` and the card
is active. `addons/survey/models/survey_survey.py:1166-1175` requires the
Survey user group, writes the session state to false, and marks active user
inputs done.

## Core3 before this slice

Core3 already had the durable `survey_live_sessions` table, session-manager
`end_live_session` action, and Cards `Start Live Session` action. The Cards
view projected `session_id`, `session_row_version`, and active
`session_state`, but had no card-level End action.

## Core3 after this slice

`pages/surveys.yaml` adds stable `end_live_session_card` with the exact Odoo
label and `surveys.manage` boundary. `api/surveys.yaml` adds the matched
`surveys.sessions.end_from_card` mutation. It receives the card's session ID
and expected row version, rejects missing actors and inactive/stale sessions,
updates the durable session to Closed, clears current-question fields, marks
active `survey_live_attendees` Completed as the Core3 equivalent of Odoo's
active user-input completion, and returns a persisted result. The existing
session-manager close mutation applies the same attendee side effect. This is
a YAML-first action over the existing service-owned schema; no bespoke page
code or migration was introduced.

The Odoo mobile capture does not expose the desktop card footer actions in the
compact card layout. Core3 visual comparison remains pending because the
Core3 server could not pass global page discovery.
