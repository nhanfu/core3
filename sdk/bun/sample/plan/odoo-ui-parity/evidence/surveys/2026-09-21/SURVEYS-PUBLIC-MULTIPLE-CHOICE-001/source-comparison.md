# Source comparison

Odoo source:

- `addons/survey/models/survey_question.py:87-96` declares
  `multiple_choice` as “Multiple choice: multiple answers allowed”.
- `addons/survey/controllers/main.py:613-637` documents multiple-choice
  answers as a list and `:647-655` normalizes a single submitted value to the
  same choice-saving path.
- `addons/survey/models/survey_user_input.py:301-302` routes both simple and
  multiple choice through `_save_line_choice`; `:316-331` replaces prior
  choice lines with the submitted option set.

Core3 mapping:

- Migration `20261006000000-039-survey-public-multiple-choice.yaml` persists a
  deterministic published survey and required `Multiple Choice` question with
  `Desk,Chair,Monitor` options.
- `api/surveys.yaml` and `pages/surveys.yaml` remain separate and joined by
  `page.id: surveys`; public progress/submit actions retain `surveys.public`.
- `PublicSurvey.ts` renders the existing `Multiple Choice` branch as checkbox
  controls. `SurveysModule.invalidPublicAnswers` rejects foreign or duplicate
  options before durable progress/submit mutation, while required completion,
  token ownership, restart, and idempotency remain API-owned.
