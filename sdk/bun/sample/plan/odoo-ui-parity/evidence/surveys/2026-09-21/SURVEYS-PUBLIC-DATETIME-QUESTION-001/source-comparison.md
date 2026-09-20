# Source comparison

Odoo source: `addons/survey/models/survey_question.py`,
`survey.question._validate_date`.

Odoo dispatches `datetime` questions to `fields.Datetime.from_string`, rejects
malformed timestamps, and applies configured min/max validation when present.
This slice implements the source-backed parsing boundary with the fixed Core3
format `YYYY-MM-DD HH:MM:SS`; range metadata remains a separate gap.

Core3 adds deterministic optional fixture `question-certification-datetime` in
migration `0.0.27`. The public renderer uses a custom text input rather than a
native browser date/time control. `SurveysModule.invalidPublicAnswers`
performs strict UTC calendar/time validation before either
`surveys.public.progress` or `surveys.public.submit` mutates durable
`answer_data`.

The API fragment remains separate from the page fragment and both advertise
`page.id: surveys`; public mutations retain `surveys.public`, with survey and
answer-token scoping enforced by existing YAML guards.
