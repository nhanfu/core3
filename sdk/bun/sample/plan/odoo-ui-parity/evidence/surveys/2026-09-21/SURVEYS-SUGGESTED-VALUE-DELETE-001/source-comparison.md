# SURVEYS-SUGGESTED-VALUE-DELETE-001 source comparison

## Odoo source

- `addons/survey/views/survey_question_views.xml:335-398` defines the
  `survey.question.answer` list/form views and the `survey_question_answer_action`
  `list,form` window action; `:400-408` places Suggested Values in the Survey
  Questions menu.
- `addons/survey/models/survey_question.py:844-869` defines
  `survey.question.answer`, orders records by `question_id, sequence, id`,
  and uses cascading `question_id`/`matrix_question_id` relations. Standard
  Odoo record deletion therefore removes the selected suggested value.
- The inspected Survey model/view/security source has no `company_id`; this
  slice records company scope as not applicable rather than inventing one.

## Core3 implementation

- `services/surveys/api/suggested-values.yaml` owns
  `delete_survey_suggested_value` with `surveys.write`, actor, missing,
  archived/stale survey, stale question/answer, and question-type guards.
- `services/surveys/pages/suggested-values.yaml` adds the dangerous Delete row
  action beside Edit. API and page fragments join through
  `page.id: survey-suggested-values`.
- `services/surveys/migrations/20261029000000-067-survey-suggested-value-delete-index.yaml`
  adds the durable `(question_id, sequence, id)` lookup index.
- On success the answer is hard-deleted and the question/survey row versions
  advance; file-backed restart and replay are covered by the focused test.
