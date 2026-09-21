# `SURVEYS-PUBLIC-TOKEN-ACCESS-001` source comparison

Odoo's `survey.survey.access_mode` is enforced by
`addons/survey/controllers/main.py:45-75`: a survey in `token` mode returns
`token_required` unless an existing `survey.user_input` answer token is
provided. `_fetch_from_access_token` at `main.py:25-43` scopes that answer to
the survey access token. Odoo stores the durable answer token on
`survey.user_input.access_token` and keeps the invitation pool token separate
at `survey_user_input.py:45-46`; answer creation is the `_create_answer`
path at `survey_survey.py:535-585`.

Core3 previously projected `access_mode` but allowed a token-only published
survey to create an anonymous response with only the survey token. Migration
`0.0.44` adds a deterministic published invitation-only fixture and a
pre-created `New` answer row with `token-access-answer-2026`. The separate
`survey.public.access` operation scopes that answer token to
`token-access-token-2026`; the public route refuses missing/wrong answer
tokens before returning the question graph or beginning the response. The
paired `pages/surveys.yaml` / `api/surveys.yaml` contract remains joined by
`page.id: surveys`, and the YAML start action independently declares the
`surveys.public` permission and token guard.

This bounded clone proves the access boundary, durable New → In Progress
transition, concurrent start convergence, and file-backed resume. It does not
claim Odoo mail delivery or full invitation-wizard parity; those remain
separate module work.
