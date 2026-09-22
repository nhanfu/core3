# SURVEYS-CARD-QUESTION-COUNT-001

## Bounded slice

Core3 adds the Odoo Surveys kanban-card `Questions` metric. The value is
derived from `survey_questions` and excludes section/page rows, matching
Odoo's computed `question_count`/`question_ids` behavior.

Source comparison:

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:70-74,277-282`
  defines `question_count` from non-page `question_ids`.
- `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:260-262`
  renders the card field with the `Questions` label.
- Core3 keeps the page/API split in `pages/surveys.yaml` and `api/surveys.yaml`
  and uses the existing durable question catalog; no migration is needed.

## Verification

- Focused test: `test/surveys_card_questions.integration.test.ts`.
- Adjacent focused card tests: `surveys_card_stats`, `surveys_card_color`,
  `surveys_card_edit`, and `surveys_card_delete`.
- UI audit passed with 850 pages, 858 routes, and 1,790 datasources; diff-check
  passed.
- BrowserSkill was connected on browser `245ea108`. One session (`fngy`) listed
  authenticated tab `1770662590` at `http://localhost:8069/odoo/contacts/9`,
  but `bsk tab borrow 1770662590 --session fngy` did not return a borrow result;
  the follow-up reported `previous session command is still running`. The
  session was stopped without navigating, so no `core3_reference` Surveys
  capture or visual-parity claim is available.

## Remaining gaps

This bounded slice does not claim full Odoo kanban rendering, answer metrics,
or visual parity. The evidence directory records the authenticated reference
browser result separately from the focused YAML/database verification.
