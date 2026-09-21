# SURVEYS-QUESTION-REORDER-001 source comparison

## Odoo source

- `question_and_page_ids` is rendered with the `question_page_one2many` widget
  and a draggable `sequence` handle at
  `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:75-80`.
- `survey.question` declares `_order = 'sequence,id'` and its persistent
  `sequence` field at
  `/home/nhanjs/projects/odoo/addons/survey/models/survey_question.py:48,71`.
- The inspected Survey model, view, and security sources contain no
  `company_id`; company scoping is not applicable to this feature.

## Core3 implementation

- `20261026000000-064-survey-question-reorder-index.yaml` adds the durable
  `(survey_id, sequence, id)` index without changing the source data model.
- `api/survey-detail.yaml` and `pages/survey-detail.yaml` expose
  `reorder_survey_question` through the existing `page.id: survey-detail`
  pair. The action accepts a question/section ID and a 1-based target position.
- The transaction shifts intervening rows, normalizes the ordered graph,
  increments `surveys.row_version`, and retains explicit actor, permission,
  missing, stale, archived, and bounds guards.

## Scope result

The bounded slice covers authenticated question/page order persistence. It
does not claim the exact Odoo drag-handle renderer or visual parity because
the Core3 and reference runtimes were unavailable during this run.
