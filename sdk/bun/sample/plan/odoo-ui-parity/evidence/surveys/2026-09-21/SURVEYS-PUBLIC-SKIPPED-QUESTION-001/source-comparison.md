# SURVEYS-PUBLIC-SKIPPED-QUESTION-001 source comparison

## Odoo source

- `addons/survey/models/survey_user_input.py:700-708` stores each answer line's
  `skipped` state independently from its answer type.
- `addons/survey/models/survey_user_input.py:354-363` creates a skipped line
  when the submitted answer is empty, clearing `answer_type` rather than
  treating an optional question as answered.
- `addons/survey/controllers/main.py:259-264` exposes skipped questions while
  preparing the public survey response; the controller also revisits skipped
  questions when navigating after submission (`588-606`).

## Core3 implementation

- Migration `0.0.48` adds durable `survey_responses.skipped_questions` and
  seeds `SURVEY/SKIPPED-QUESTION` with required, optional, and required public
  questions.
- The paired `page.id: surveys` API contract exposes the field through public
  progress/submit/start results and authenticated response detail. Public
  mutations remain under `surveys.public`; authenticated inspection remains
  under `surveys.read`.
- `services/surveys/module.ts` validates skipped IDs against the survey's
  question graph, rejects required/foreign IDs before mutation, removes a
  skip when an answer is supplied, and preserves the delimiter-safe set across
  restart and idempotent submit.
- `PublicSurvey.ts` sends the local skipped-question set when an optional
  question is left blank and restores it from the durable response.

This bounded slice covers optional public-question skip persistence and guards;
it does not claim full Odoo skipped-mandatory-question revisit behavior.
