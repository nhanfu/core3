# SURVEYS-QUESTION-EDIT-001 source comparison

## Odoo source

- The installed Odoo source declares `survey_question_form` for model
  `survey.question`; the form edits the required `title`, `question_type`, and
  related question metadata at
  `/home/nhanjs/projects/odoo/addons/survey/views/survey_question_views.xml:5-37`.
- Odoo persists `title`, `survey_id`, `sequence`, and the question type
  selection on `survey.question`; stable ordering is `_order = 'sequence,id'`
  at `/home/nhanjs/projects/odoo/addons/survey/models/survey_question.py:45-97`.
- The Questions menu opens `action_survey_question_form` for `survey.question`
  at `/home/nhanjs/projects/odoo/addons/survey/views/survey_question_views.xml:318-324`.
- The inspected Survey model, view, and security source contain no
  `company_id`; company scoping is not applicable to this feature.

## Core3 implementation

- `20261027000000-065-survey-question-edit.yaml` adds durable question
  `row_version` and `updated_at` columns, retaining edits across file-backed
  restart.
- `api/question-detail.yaml` exposes the guarded `edit_survey_question`
  server form with `surveys.write`, while `pages/question-detail.yaml` keeps
  the authenticated header action reference. Both fragments join through
  `page.id: survey-question-detail`.
- The transaction updates question text/type/sequence/required/suggested
  answers, advances the question and parent survey versions, and rejects
  actor, missing, archived/stale parent, stale question, title/type, and
  sequence failures before mutation.

## Scope result

The bounded slice covers durable authenticated Survey Question metadata edits.
It does not claim authenticated visual parity or a paired Odoo runtime result:
Core3 ports and Odoo reference port 8072 were closed during this run, and the
primary live Odoo Surveys app is recorded as uninstalled in the parity plan.
