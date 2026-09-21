# SURVEYS-PUBLIC-LANGUAGE-001 source comparison

## Odoo source

- `addons/survey/models/survey_survey.py:46-52` defines `survey.survey.lang_ids`
  as the supported `res.lang` records, defaulting to the active frontend
  language and allowing an empty value to mean all installed languages.
- `addons/survey/models/survey_user_input.py:26-35` defines the durable
  participant `lang_id` alongside response state and start time.
- `addons/survey/controllers/main.py:490-505` accepts `lang_code` on the
  public begin JSON route, writes the language to the answer, and then marks
  the answer in progress.
- `addons/survey/controllers/main.py:912-925` uses the stored answer language
  first and otherwise falls back to a language supported by the survey.

## Core3 slice

- Migration `0.0.49` adds nullable `surveys.languages` and
  `survey_responses.language_code`, then seeds `en_US||fr_FR` on the published
  `SURVEY/PUBLIC-LANGUAGE` fixture.
- `services/surveys/api/surveys.yaml` owns the public mutation and
  `services/surveys/pages/surveys.yaml` owns the page binding; both retain
  `page.id: surveys`. The authenticated detail API/page expose `languages`
  and `language_code` under `surveys.read`.
- `services/surveys/module.ts` rejects unsupported public codes before
  insertion, defaults a new response to the first configured code, and returns
  `SURVEY_PUBLIC_LANGUAGE_LOCKED` if a caller tries to change a started
  response. The token-scoped read and start routes remain public-only.
- `public/components/PublicSurvey.ts` renders the selector only for a
  multi-language survey and posts the selected code. It does not synthesize
  translated survey content, so translation-catalog parity remains open.
