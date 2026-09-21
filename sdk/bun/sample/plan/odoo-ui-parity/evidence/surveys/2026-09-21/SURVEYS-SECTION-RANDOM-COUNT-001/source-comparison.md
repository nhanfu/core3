# `SURVEYS-SECTION-RANDOM-COUNT-001` source comparison

## Odoo source

- `addons/survey/models/survey_question.py:76-84` defines the page-level
  `random_questions_count` field with default 1 and describes its use for
  randomized sections.
- `addons/survey/models/survey_survey.py:621-645` preserves questions without
  a page and, for randomized surveys, samples the configured count from each
  page when the count is between zero and the section size; otherwise it keeps
  the full section.
- `addons/survey/views/survey_question_views.xml:29-33` renders the field in
  the section form when the survey uses randomized selection.
- The inspected Survey model/view/security source has no `company_id`; a
  company guard is therefore not applicable to this source action.

## Core3 implementation

- `services/surveys/migrations/20261030000000-068-survey-section-random-count.yaml`
  adds durable storage and a restart fixture.
- `services/surveys/api/survey-detail.yaml` owns the guarded server form;
  `services/surveys/pages/survey-detail.yaml` owns the grid field/action, and
  both declare `page.id: survey-detail`.
- `services/surveys/operations.yaml` derives each question's current section
  and persisted count. `services/surveys/module.ts` samples each section with
  a stable seed, persists `question_order`, and reuses that order for resumed
  tokens.
- Guards cover write permission, actor presence, missing/non-section rows,
  archived or changed surveys, stale section versions, and count range.

Odoo itself was not available for a live paired comparison in this run; the
exact runtime blocker is recorded in `browser-results.json`.
