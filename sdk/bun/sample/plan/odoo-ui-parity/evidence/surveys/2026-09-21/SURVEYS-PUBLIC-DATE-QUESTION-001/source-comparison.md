# Source comparison

Odoo source: `addons/survey/models/survey_question.py`.

`validate_question` dispatches `date` and `datetime` to `_validate_date`, which
parses the submitted value using the Odoo date/datetime field parser before
accepting the answer. This slice intentionally implements only the smaller
date behavior; `datetime`, `matrix`, and `scale` remain separate gaps.

Core3 adds the deterministic optional fixture
`question-certification-date` in migration `0.0.26`. The public renderer uses a
custom text input with `YYYY-MM-DD` guidance rather than a native browser date
control. `SurveysModule.invalidPublicAnswers` performs strict calendar-date
validation before either `surveys.public.progress` or
`surveys.public.submit` can mutate durable `answer_data`.

The API fragment remains separate from the page fragment and both advertise
`page.id: surveys`; public mutations retain `surveys.public`, with token and
survey scoping enforced by the existing YAML guards.
