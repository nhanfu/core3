# Source comparison

## Odoo source and workflow

- `addons/survey/models/survey_question.py:138-146` defines
  `comments_allowed`, `comments_message`, and `comment_count_as_answer` for
  simple choice, multiple choice, and matrix questions.
- `addons/survey/models/survey_question.py:450-483` validates the submitted
  answer by question type; `:537-550` counts a comment as a valid answer for a
  mandatory choice when `comment_count_as_answer` is enabled.
- `addons/survey/controllers/main.py:559-570` extracts comments before
  validation and saves the answer and comment separately.
- `addons/survey/controllers/main.py:613-656` documents the source payload:
  a choice answer can carry a list containing the selected answer and a
  `{comment: ...}` object; matrix answers can carry a comment alongside the
  row map.
- `addons/survey/static/src/interactions/survey_form.js:256-323` keeps the
  comment field visible with choice changes and avoids auto-advancing while a
  comment is being entered.

## Core3 implementation

- Migration `0.0.31` adds durable question comment settings and seeds the
  published `comments-public-token-2026` fixture.
- `survey.public.comment_settings` exposes the settings through the API
  contract without coupling them into the authenticated page YAML.
- `services/surveys/module.ts` merges settings into public question records,
  rejects comments attached to questions that do not allow them, and treats a
  configured non-empty comment as satisfying a required choice.
- `public/components/PublicSurvey.ts` renders the source comment message and
  stores the comment under a stable question-scoped answer-data key; the
  existing public token, state, idempotency, and restart boundaries remain in
  force.
- `services/surveys/pages/surveys.yaml` and `api/surveys.yaml` remain separate
  and joined by `page.id: surveys`.

The bounded mapping intentionally uses answer-data sidecar keys rather than
changing existing scalar choice values, so scoring, conditional triggers, and
existing response consumers remain compatible.
