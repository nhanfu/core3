# Source comparison — `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`

Odoo source `addons/survey/models/survey_question.py:143-153` defines the
validation-required flag, numeric minimum/maximum, and validation message.
`_validate_numerical_box` at lines 500-511 rejects non-numeric input and, when
validation is enabled, values outside the configured inclusive range before
the answer line is saved.

Core3 migration `20261003000000-036-survey-public-numerical-question.yaml`
adds the durable validation columns and seeds a separate published
`Numerical Range Survey`. The existing `page.id: surveys` page/API pair
projects those fields through `survey.public.questions`; `surveys.public`
progress and submit validate them before mutation. The renderer uses a numeric
input with inclusive min/max attributes and the persisted error message.

This slice covers numeric range semantics only. It does not claim Odoo's
authenticated question editor, scoring-specific numerical answers, or other
question types.
