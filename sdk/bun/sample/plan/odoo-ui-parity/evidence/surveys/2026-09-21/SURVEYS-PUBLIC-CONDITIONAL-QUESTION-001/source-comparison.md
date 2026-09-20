# Source comparison

## Odoo source and workflow

- `addons/survey/models/survey_question.py:171-178` defines
  `triggering_answer_ids` as stored triggering answers; an empty relation
  means the question is always displayed.
- `addons/survey/models/survey_question.py:333-376` derives allowed and
  triggering-question relationships from the same survey and answer records.
- `addons/survey/models/survey_user_input.py:525-529` describes the runtime
  conditional map used to decide which selected answers display another
  question; `:595-600` removes answers for questions that become inactive.
- `addons/survey/controllers/main.py:277-287` builds the conditional maps for
  the rendered survey response.
- `addons/survey/data/survey_demo_conditional.xml:468-501` seeds the
  `survey_demo_food_preferences` root question and a follow-up triggered by
  the `It depends` answer; `:514-545` shows follow-ups with more than one
  trigger answer.

## Core3 implementation

- Migration `0.0.30` creates durable `survey_question_triggers` rows and the
  deterministic public `survey-demo-branching` fixture.
- `services/surveys/operations.yaml` projects trigger metadata in the public
  question, first, current, next, and previous operations. The first query
  excludes triggered roots; the service skips hidden candidates using the
  token's durable `answer_data`.
- `services/surveys/module.ts` filters GET/progress/submit question sets by
  trigger answer, preserves token/state/`surveys.public` guards, and keeps
  cursor mutations idempotent.
- `public/components/PublicSurvey.ts` accepts a returned conditional question
  from next/previous navigation, merges it into the sorted local set, and
  renders it rather than reporting an unavailable question.
- `services/surveys/pages/surveys.yaml` and `services/surveys/api/surveys.yaml`
  remain independent YAML contracts joined by `page.id: surveys`.

The bounded mapping is intentionally one source question and exact answer
per trigger row. Odoo's multi-answer trigger and inactive-answer cleanup
remain separate future behavior.
