# Odoo action analysis

- `addons/survey/controllers/survey_session_manage.py` owns `/s/<session_code>`
  and `/survey/check_session_code/<session_code>`, admitting only a ready or
  in-progress non-certification session.
- `addons/survey/controllers/main.py` owns the public token-scoped submit
  contract `/survey/submit/<survey_token>/<answer_token>`. It validates the
  current question, calls `survey.user_input._save_lines`, and keeps a live
  session answer in progress for host-driven question changes.
- `addons/survey/models/survey_user_input.py` stores session nickname/answer
  state and computes answer score; the session manager then exposes answer
  counts and leaderboard values.

Core3 mirrors this as `POST /api/public/surveys/session/<session_code>/answer`
with `attendee_token` and `answer_value`, a durable answer line, score and
session-counter updates, and replay-safe current-question scoping.
