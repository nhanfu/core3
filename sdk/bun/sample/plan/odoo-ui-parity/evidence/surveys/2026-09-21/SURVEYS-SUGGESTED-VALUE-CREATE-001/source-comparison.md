# `SURVEYS-SUGGESTED-VALUE-CREATE-001` source comparison

## Odoo source

- `addons/survey/models/survey_question.py:835-871` defines
  `survey.question.answer`, its choice/multiple-choice/matrix purpose, stable
  `question_id, sequence, id` ordering, 90-character value limit, and
  non-empty-value constraint.
- `addons/survey/views/survey_question_views.xml:335-398` defines the
  Suggested Values list/form action over `survey.question.answer`, including
  question, value, sequence, score, and matrix relations.
- The inspected Survey model/view/security source has no `company_id`; a
  company predicate is not applicable to this action.

## Core3 implementation

- `services/surveys/migrations/20261031000000-069-survey-suggested-value-create.yaml`
  seeds a fixed choice question and existing label for durable create tests.
- `services/surveys/api/suggested-values.yaml` owns
  `create_survey_suggested_value`; `services/surveys/pages/suggested-values.yaml`
  owns only the list/create binding. Both use `page.id:
  survey-suggested-values`.
- The mutation derives the source question and next sequence, inserts the
  answer with durable version/timestamp state, advances question and survey
  versions, and rejects duplicate request keys before mutation.

Odoo was not authenticated in this run. The browser login redirect and
runtime availability are recorded precisely in `browser-results.json`.
