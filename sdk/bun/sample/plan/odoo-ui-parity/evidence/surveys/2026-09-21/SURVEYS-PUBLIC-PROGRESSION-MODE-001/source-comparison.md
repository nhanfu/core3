# SURVEYS-PUBLIC-PROGRESSION-MODE-001 source comparison

## Odoo source

- `odoo/addons/survey/models/survey_survey.py:85-88` defines the durable
  `progression_mode` selection: `percent` or `number`, defaulting to
  percentage display.
- `odoo/addons/survey/views/survey_templates.xml:39-51` selects the active
  question/page list and computes the current page number according to that
  setting.
- `odoo/addons/survey/views/survey_templates.xml:691-704` renders either
  percentage completion or the numeric answered/page count and progress bar.
- `odoo/addons/survey/controllers/main.py:386-400` supplies the page list and
  current page number to the progression template for an in-progress public
  response.

## Core3 implementation

- Migration `0.0.46` adds durable `surveys.progression_mode`, normalizes
  existing rows to Odoo's `percent` default, and seeds a deterministic
  `number`-mode two-question public survey.
- `survey.public.detail` and the Surveys list datasource project the setting;
  `pages/surveys.yaml` and `api/surveys.yaml` remain paired by
  `page.id: surveys`.
- `PublicSurvey.ts` consumes the setting for the page-per-question footer:
  percentage mode renders `% completed`, while number mode renders the
  answered count. One-page surveys retain their source-specific all-questions
  footer.
- Existing `surveys.public` token, response-state, required-answer, time, and
  idempotency guards remain authoritative; the mode is read-only public
  metadata and does not widen mutation access.
