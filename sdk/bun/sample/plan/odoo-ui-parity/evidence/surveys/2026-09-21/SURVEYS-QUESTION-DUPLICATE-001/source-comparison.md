# Surveys question duplication — source comparison

Feature: `SURVEYS-QUESTION-DUPLICATE-001`

Odoo source comparison:

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_question.py:420-425`
  implements `survey.question.copy()` through the ORM and preserves the
  question's triggering-answer relationships.
- `/home/nhanjs/projects/odoo/addons/survey/views/survey_question_views.xml:5-9`
  uses the Survey Question form with creation disabled; duplication is a
  form action rather than a new-question create flow.

Core3 implementation:

- `services/surveys/pages/question-detail.yaml` exposes a permissioned Odoo
  Actions-menu Duplicate entry and navigates to the copied question.
- `services/surveys/api/question-detail.yaml` keeps the API action separate
  from the page action while joining through `page.id: survey-question-detail`.
- The YAML mutation copies the question row and all relation-backed suggested
  values in one durable transaction, increments the parent survey
  `row_version`, and returns the copied question for navigation.
- `surveys.write`, source existence, archived parent, parent-version, and
  duplicate-id guards run before mutation. The duplicate keeps the source
  question text/type/sequence/required/options and receives a fresh ID.

No Odoo parity sign-off is claimed: the authenticated reference route was not
available in this environment.
