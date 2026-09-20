# Source comparison

Odoo source: `addons/survey/controllers/main.py`, `survey_begin`.

The Odoo controller accepts a survey token and answer token, validates the
answer, changes a `New` answer to `In Progress`, and prepares the first
question before rendering the public survey page. Core3 maps that lifecycle to
the `/survey/start/<survey_token>/<answer_token>` page handler plus the
separate `public_survey_begin` YAML action. The action persists `state` and
`current_question_id` in `survey_responses`, with `surveys.public`, token,
deadline, first-question, and state guards.

The Core3 handler retries a transaction conflict and reads the token-scoped
committed response, making concurrent begin calls converge on one durable
response. Restart tests reopen the same DuckDB file and verify the cursor and
state remain unchanged; a submitted response cannot be begun again.

The installed Odoo instance at `127.0.0.1:8069` rendered the valid Feedback
Form but remained in the host-controlled waiting state, so no mutable begin
comparison was possible. The disposable reference at `127.0.0.1:8072` was
unavailable.
