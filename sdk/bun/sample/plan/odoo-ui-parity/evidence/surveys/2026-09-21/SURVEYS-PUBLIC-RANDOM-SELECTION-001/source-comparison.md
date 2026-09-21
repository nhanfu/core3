# SURVEYS-PUBLIC-RANDOM-SELECTION-001 source comparison

## Odoo source

- `addons/survey/models/survey_survey.py:80-84` defines the required
  `questions_selection` setting with `all` and `random` values. Odoo labels
  `random` as randomized per section and excludes it from live-session mode.
- `addons/survey/controllers/main.py:395-402` uses the response's
  `predefined_question_ids` when the survey is page-per-question and random,
  then computes progression against that response-specific list.

## Core3 implementation

- Migration `0.0.47` adds `surveys.questions_selection` and the durable
  `survey_responses.question_order` cursor, and seeds the published
  `SURVEY/RANDOM-SELECTION` fixture with three deterministic Choice questions.
- `services/surveys/operations.yaml` and `api/surveys.yaml` project the setting,
  return `question_order`, and keep public actions under `surveys.public`.
  The paired admin page/API contracts expose the setting with `page.id: surveys`
  and `surveys.read` for authenticated inspection.
- `services/surveys/module.ts` derives a stable per-answer order from the answer
  token, persists it at start/begin/retry, navigates against it, and replays the
  same cursor after restart or a repeated navigation key. Wrong answer tokens
  are rejected before response disclosure or mutation.
- `public/components/PublicSurvey.ts` consumes the persisted order so the
  rendered page follows the same server-authoritative cursor.

This is a bounded single-section public implementation. It does not claim full
Odoo section-level sampling or live-session parity.
