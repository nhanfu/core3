# `SURVEYS-PUBLIC-BACK-GUARD-001` source comparison

Odoo source `addons/survey/models/survey_survey.py:98` stores
`users_can_go_back` as a durable survey option. `_can_go_back` at
`survey_survey.py:647-664` denies the Back control when the option is false,
the survey is one-page, or the response is not in progress. The controller
passes that result to the public template at `controllers/main.py:359` and
`363`; answer persistence also uses the setting at `controllers/main.py:567`.

Core3 migration `0.0.43` adds the durable boolean and a fixed published
two-question `No Back Customer Survey` fixture. Existing deterministic public
fixtures are explicitly set true to preserve their prior navigation semantics;
the new fixture remains false. `services/surveys/pages/surveys.yaml` remains
layout-only and `api/surveys.yaml` owns the public action, joined by
`page.id: surveys`. Admin list/detail projections expose the option through
the paired contracts.

The public detail operation returns `users_can_go_back`; `PublicSurvey.ts`
omits Back when it is false, while the `surveys.public.previous_question`
mutation independently requires the durable setting. A transient concurrent
DuckDB update conflict now retries the navigation idempotency key and replays
the winner, so the renderer cannot bypass the source rule and concurrent
allowed navigation does not leak a storage conflict.
