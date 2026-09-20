# Source comparison

Odoo source: `addons/survey/models/survey_question.py`,
`survey.question._validate_scale`, plus the Scale fields in
`views/survey_question_views.xml`.

Odoo defines Scale questions with a bounded minimum/maximum range and validates
the mandatory answer through `_validate_scale`. Core3 adds deterministic
optional fixture `question-certification-scale` in migration `0.0.28`, encoding
the source default 0–10 range in the existing durable `answer_options` field.
The public renderer presents those values as radio choices, and
`SurveysModule.invalidPublicAnswers` rejects values outside that range before
progress or submit mutates `answer_data`.

The API fragment remains separate from the page fragment and both advertise
`page.id: surveys`; public mutations retain `surveys.public`, with survey and
answer-token scoping enforced by existing YAML guards.
