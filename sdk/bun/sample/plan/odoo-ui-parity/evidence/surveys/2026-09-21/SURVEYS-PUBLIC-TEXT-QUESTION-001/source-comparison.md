# Source comparison — `SURVEYS-PUBLIC-TEXT-QUESTION-001`

Odoo's `survey.question.question_type` declares `text_box` as “Multiple Lines
Text Box” in `addons/survey/models/survey_question.py:87-97`. The public
template calls `survey.question_text_box` for that type and renders a three-row
`textarea` (`addons/survey/views/survey_templates.xml:369-390`). The answer
line stores the value in `value_text_box`, and Odoo's mandatory validation
rejects empty text before submission (`addons/survey/models/survey_question.py:468-483`).

Core3 migration `20261005000000-038-survey-public-text-question.yaml` seeds a
separate published `Product Feedback Survey` with a required `Text` question;
`Text` is the existing Core3 label for Odoo `text_box`. The paired
`page.id: surveys` API/page contract returns the type through
`survey.public.questions`. Token-scoped `surveys.public` progress and submit
preserve the scalar multi-line value in durable `answer_data`, reject arrays and
missing required values before mutation, and retain restart/idempotency guards.

This slice covers public multi-line text response semantics only. It does not
claim Odoo's authenticated question editor or full answer-line/report parity.
