# Surveys certification badge comparison

## Odoo source

- `addons/survey/models/survey_survey.py:137-145` configures the certification
  badge and its give-badge flag.
- `addons/survey/models/survey_survey.py:1228-1252` creates the gamification
  goal/challenge that awards the badge after a succeeded certification.
- `addons/survey/views/survey_templates.xml:324-326` displays the badge after
  a successful public certification completion.

## Core3 mapping

- `services/surveys/api/certification-badge.yaml` and
  `services/surveys/pages/certification-badge.yaml` share
  `page.id: survey-certification-badge`.
- `survey_certification_badge` is permissioned with `surveys.read` and only
  selects completed participants with `quiz_passed = true`.
- `surveys.certification.badge` requires `surveys.manage`, checks the passed
  state and signed-in actor, and inserts/replays one participant-keyed ledger
  row before refreshing the badge detail.
- Participant detail exposes the authenticated badge surface only when the
  participant is passed.

This bounded implementation represents the Odoo gamification reward as a
durable Surveys-owned award ledger. It does not claim public renderer badge
image parity or integration with a separate gamification module.
