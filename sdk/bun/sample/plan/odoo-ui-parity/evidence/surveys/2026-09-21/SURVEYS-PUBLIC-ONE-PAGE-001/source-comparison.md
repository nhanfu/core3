# SURVEYS-PUBLIC-ONE-PAGE-001 source comparison

## Odoo source

- `odoo/addons/survey/models/survey_survey.py:75-79` defines required
  `questions_layout` values, including `one_page` (“One page with all the
  questions”), with `page_per_question` as the default.
- `odoo/addons/survey/controllers/main.py:278-298` switches the public
  payload from a question cursor to a page payload whenever the layout is not
  `page_per_question`.
- `odoo/addons/survey/controllers/main.py:337-363` omits the previous-page
  cursor for `one_page` and keeps the page-level workflow separate from
  one-question pagination.
- `odoo/addons/survey/controllers/main.py:581-582` marks the response done
  when a one-page survey is submitted.

## Core3 implementation

- Migration `0.0.45` adds durable `surveys.questions_layout`, normalizes old
  rows to `page_per_question`, and seeds `survey-demo-one-page` with two
  deterministic Choice questions.
- `survey.public.detail` and the Surveys list datasource project the setting
  with a default, while `pages/surveys.yaml` and `api/surveys.yaml` remain
  paired by `page.id: surveys`.
- `PublicSurvey.ts` consumes `questions_layout=one_page`, renders every
  visible question in one page, collects all values, and submits the same
  token-scoped durable response through the existing `surveys.public` route.
  Existing page-per-question navigation is unchanged.
- Required-answer checks remain client-visible and the authoritative API
  validates the complete answer object before mutation. Existing access-token,
  response-state, time, and idempotency guards remain in the mutation path.
