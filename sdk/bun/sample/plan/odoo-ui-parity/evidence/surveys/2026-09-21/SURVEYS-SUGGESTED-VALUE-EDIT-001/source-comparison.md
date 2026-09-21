# SURVEYS-SUGGESTED-VALUE-EDIT-001 source comparison

## Odoo source

- Odoo registers the Suggested Values action as `survey_question_answer_action`
  over `survey.question.answer`, with grouped `list,form` views, at
  `/home/nhanjs/projects/odoo/addons/survey/views/survey_question_views.xml:335-398`.
- The list uses a sequence handle and the form edits `question_id`,
  `value`, `sequence`, `answer_score`, and matrix metadata. The model
  declares `_order = 'question_id, sequence, id'` and a 90-character
  suggested-answer limit at
  `/home/nhanjs/projects/odoo/addons/survey/models/survey_question.py:844-869`.
- The menu item is `menu_survey_label_form1`, labelled Suggested Values and
  bound to `survey_question_answer_action`, at
  `/home/nhanjs/projects/odoo/addons/survey/views/survey_question_views.xml:400-408`.
- The inspected Survey model, view, and security source contain no
  `company_id`; company scoping is not applicable to this feature.

## Core3 implementation

- `20261028000000-066-survey-suggested-value-edit.yaml` adds durable
  `updated_at` audit storage for suggested-value edits.
- `api/suggested-values.yaml` exposes the permissioned
  `edit_survey_suggested_value` server form. The list's open, double-click,
  and row-menu bindings live in `pages/suggested-values.yaml`; both fragments
  join through `page.id: survey-suggested-values`.
- The transaction updates value/sequence/score/matrix metadata, advances
  suggested-value, question, and parent survey versions, and rejects missing,
  actor, unsupported-type, archived/stale, value-length, sequence, and score
  failures before mutation.

## Scope result

The bounded slice covers durable authenticated Suggested Value edits. It does
not claim authenticated visual parity or paired Odoo runtime evidence:
Core3 ports and Odoo reference port 8072 were closed during this run.
