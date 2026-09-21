# Gap matrix

| Stable ID | Odoo action/view | Required contract | Files | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-TIME-LIMIT-CONFIG-001 | Survey form → Options → Time & Scoring | Read `is_time_limited`/`time_limit`, guarded update, persistence, public projection, responsive evidence | `services/surveys/pages/survey-detail.yaml`, `services/surveys/api/survey-detail.yaml`, focused test | Implemented; visual Core3 proof blocked |

No new migration was required: migration `0.0.41` already persists these
columns and `survey_responses.start_datetime` for the public timer. No
live-session timer or scoring behavior was changed.
