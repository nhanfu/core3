# Source comparison

| Concern | Odoo 19 source | Core3 slice |
| --- | --- | --- |
| Session admission | `survey_session_manage.py` `_fetch_from_session_code` and `/s/<session_code>` | `survey.public.session` plus the existing public join route |
| Attendee answer | `main.py` `/survey/submit/<survey_token>/<answer_token>` and `_save_lines` | `/api/public/surveys/session/<code>/answer` and `surveys.sessions.answer` |
| Current question | `survey.session_question_id` | `survey_live_sessions.current_question_id` |
| Durable answer | `survey.user_input.line` | `survey_live_session_answers` |
| Score/statistics | `survey_user_input.py` scoring and session counters | deterministic score derivation, attendee score, answer counters |
| Replay protection | Odoo token/current-answer ownership | unique migration index plus route replay response |

Core3 intentionally keeps host Next/Results/Leaderboard behavior in the
existing authenticated manager contracts; this slice only adds the attendee
current-question write.
