# SURVEYS-SUGGESTED-VALUE-REORDER-001 source comparison

## Odoo source

- `addons/survey/views/survey_question_views.xml:335-344` defines the
  `survey.question.answer` list and renders `sequence` with the `handle`
  widget; `:387-398` exposes the `Suggested Values` `list,form` action.
- `addons/survey/models/survey_question.py:844-857` defines the answer model,
  stable `_order = 'question_id, sequence, id'`, and persisted `sequence`.
- The inspected Survey model/view/security source has no `company_id`; this
  slice records company scope as not applicable.

## Core3 implementation

- `services/surveys/api/suggested-values.yaml` owns
  `reorder_survey_suggested_value`, renumbering one question's answers and
  advancing answer/question/survey versions with guarded optimistic writes.
- `services/surveys/pages/suggested-values.yaml` adds the write-permissioned
  Reorder row action beside Edit/Delete. API and page fragments join through
  `page.id: survey-suggested-values`.
- Existing migration `0.0.67` provides the durable
  `(question_id, sequence, id)` index; the existing sequence/version/timestamp
  columns persist the order across restart without a redundant schema change.
